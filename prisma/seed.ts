import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { extendAccess, orderValue, tierFor, type PlanKey } from "../lib/platform-plans";
import { locate } from "../lib/geo/places";
import { currencyForCity } from "../lib/geo/currency";
import type {
  AttendanceSource,
  LeadSource,
  LeadStatus,
  BillingInterval,
  Gender,
  GymLinkKind,
  PaymentMethod,
  PaymentStatus,
  PlanType,
  SubscriptionStatus,
} from "../lib/generated/prisma/enums";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEMO_PASSWORD = "demo1234";

/**
 * Enquiry names, drawn from once each.
 *
 * One pool across every gym so no two tenants end up holding a person with the
 * same name — which would make a cross-tenant leak look like clean data.
 */
const LEAD_POOL: [string, string][] = [
  ["Nikhil Verma", "+91 98330 11204"],
  ["Farah Sheikh", "+91 99201 55832"],
  ["Rakesh Menon", "+91 98670 20014"],
  ["Divya Kulkarni", "+91 90040 77219"],
  ["Imran Qureshi", "+91 98191 33065"],
  ["Sneha Pillai", "+91 97025 44810"],
  ["Arjun Bhatt", "+91 98450 71126"],
  ["Leena Fernandes", "+91 99860 22347"],
  ["Sameer Chawla", "+91 98800 63419"],
  ["Ritika Bose", "+91 90190 84572"],
  ["Manav Grover", "+91 98110 29538"],
  ["Tanvi Rane", "+91 99304 66201"],
  ["Zoya Ansari", "+91 98204 77390"],
  ["Karthik Nair", "+91 98470 15264"],
  ["Pooja Sethi", "+91 98730 40918"],
  ["Vikram Salunkhe", "+91 99700 32846"],
  ["Anaya Deshmukh", "+91 90280 55137"],
  ["Harsh Vora", "+91 99250 60482"],
];
let leadCursor = 0;

/* ── deterministic helpers ─────────────────────────────────── */

let seedState = 42;
/** Mulberry32 — stable pseudo-randomness so reseeding reproduces the same data. */
function rand(): number {
  seedState |= 0;
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

/** The next occurrence of a weekday (1 = Monday … 7 = Sunday), as a UTC date. */
function nextWeekday(dayOfWeek: number): Date {
  const base = new Date(Date.UTC(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()));
  const current = base.getUTCDay() === 0 ? 7 : base.getUTCDay();
  base.setUTCDate(base.getUTCDate() + ((dayOfWeek - current + 7) % 7));
  return base;
}

/** Local midnight `days` from today — for timestamp columns. */
function daysFromToday(days: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * The same calendar day as UTC midnight, for Postgres `date` columns.
 * Writing local midnight would store the previous day east of UTC.
 */
function dayOnly(days: number): Date {
  const d = daysFromToday(days);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function at(days: number, hour: number, minute = 0): Date {
  const d = daysFromToday(days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/* ── roster ────────────────────────────────────────────────── */

type ClientSpec = {
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  height: number;
  dob: string;
  goal: string;
  planKey: string;
  startOffset: number;
  status: SubscriptionStatus;
  autoRenew: boolean;
  startWeight: number;
  currentWeight: number;
  startBodyFat: number;
  currentBodyFat: number;
  /** Weeks of history to generate. 0 = consultation-only client. */
  weeks: number;
  /** Most recent N check-ins left unreviewed (they surface as pending). */
  unreviewed: number;
  /** Skip the latest week so the client reads as overdue. */
  overdueWeeks?: number;
  feedback: string[];
  notes: string[];
  /** An earlier, completed subscription — proves Client M:N Plan. */
  priorPlanKey?: string;
};

const CLIENTS: ClientSpec[] = [
  {
    name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone: "+91 98200 41122",
    gender: "MALE",
    height: 178,
    dob: "1994-03-18",
    goal: "Lose 8 kg and build visible core definition",
    planKey: "transformation",
    startOffset: -63,
    status: "ACTIVE",
    autoRenew: false,
    startWeight: 82,
    currentWeight: 76.5,
    startBodyFat: 24.8,
    currentBodyFat: 17.2,
    weeks: 9,
    unreviewed: 1,
    feedback: [
      "Energy has been much better this week. Sleep is finally consistent at 7 hours.",
      "Travelled for work on Wed and Thu, managed hotel gym sessions but nutrition slipped.",
      "Best week so far — hit all four sessions and stayed on protein every day.",
      "Knees felt tight during squats. Reduced load and it settled.",
      "Cravings in the evening were tough. The extra bedtime snack you suggested helped.",
    ],
    notes: [
      "Responds well to higher volume. Keep upper body at 16 sets/week.",
      "Tends to under-eat protein on travel weeks — send the travel meal card before trips.",
      "Discussed the plateau at week 6. Dropped steps target to 9k, weight moved again.",
    ],
  },
  {
    name: "Sarah Patel",
    email: "sarah.patel@example.com",
    phone: "+91 99303 55418",
    gender: "FEMALE",
    height: 165,
    dob: "1991-11-02",
    goal: "Body recomposition — leaner at the same weight",
    planKey: "coaching",
    startOffset: -30,
    status: "ACTIVE",
    autoRenew: true,
    startWeight: 68,
    currentWeight: 63.2,
    startBodyFat: 31.5,
    currentBodyFat: 25.1,
    weeks: 4,
    unreviewed: 0,
    priorPlanKey: "transformation",
    feedback: [
      "Loved the new push/pull split. Shoulders finally feel like they're growing.",
      "Period week so energy was low, but I kept the walks going.",
      "Hit a 60 kg deadlift for 5. Genuinely did not think that was possible.",
      "Work has been intense. Two sessions missed but nutrition stayed clean.",
    ],
    notes: [
      "Renewed from the 12-week transformation. Long-term client — prioritise retention.",
      "Adjust volume down in the week before her cycle; she reports better recovery.",
    ],
  },
  {
    name: "Aarav Mehta",
    email: "aarav.mehta@example.com",
    phone: "+91 97690 20734",
    gender: "MALE",
    height: 172,
    dob: "1999-07-25",
    goal: "Gain 6 kg of lean mass",
    planKey: "coaching",
    startOffset: -21,
    status: "ACTIVE",
    autoRenew: true,
    startWeight: 61.4,
    currentWeight: 64.1,
    startBodyFat: 13.2,
    currentBodyFat: 14.6,
    weeks: 3,
    unreviewed: 0,
    feedback: [
      "Eating this much is the hardest part. Shakes are helping.",
      "Bench went from 45 kg to 52.5 kg for 8. Very happy.",
      "Appetite improved a lot this week. Hit calories on 6/7 days.",
    ],
    notes: [
      "Hardgainer. Do not cut calories at the first sign of fat gain — hold for 3 weeks.",
      "Wants to compete in a physique show next year. Revisit in Q3.",
    ],
  },
  {
    name: "Priya Shah",
    email: "priya.shah@example.com",
    phone: "+91 98111 88240",
    gender: "FEMALE",
    height: 158,
    dob: "1988-01-14",
    goal: "Fat loss with a sustainable food routine",
    planKey: "nutrition",
    startOffset: -49,
    status: "ACTIVE",
    autoRenew: true,
    startWeight: 71,
    currentWeight: 67.4,
    startBodyFat: 35.2,
    currentBodyFat: 30.8,
    weeks: 7,
    unreviewed: 1,
    feedback: [
      "The portion guide made a huge difference. No more guessing at dinner.",
      "Family wedding week — ate out four times but got straight back on track.",
      "Down another kilo. Clothes are noticeably looser around the waist.",
      "Struggled with breakfast timing because of the school run.",
    ],
    notes: [
      "Nutrition-only client. Do not prescribe training — she has a physio programme.",
      "Prefers vegetarian options. All meal cards must have paneer/dal alternatives.",
    ],
  },
  {
    name: "Kabir Joshi",
    email: "kabir.joshi@example.com",
    phone: "+91 90040 71165",
    gender: "MALE",
    height: 181,
    dob: "1986-09-09",
    goal: "Get back to a 140 kg deadlift and lose the belly",
    planKey: "elite",
    startOffset: -75,
    status: "ACTIVE",
    autoRenew: true,
    startWeight: 90.2,
    currentWeight: 86.2,
    startBodyFat: 27.4,
    currentBodyFat: 22.9,
    weeks: 10,
    unreviewed: 0,
    overdueWeeks: 2,
    feedback: [
      "Back squats felt strong. Added 5 kg without a change in RPE.",
      "Business trip to Singapore. Gym access was limited to dumbbells.",
      "Sleep has been poor — closing a funding round. Kept sessions to three.",
    ],
    notes: [
      "Founder, unpredictable schedule. Always offer a 30-min dumbbell fallback session.",
      "Missed the last two check-ins. Nudge on WhatsApp before escalating.",
    ],
  },
  {
    name: "Ananya Iyer",
    email: "ananya.iyer@example.com",
    phone: "+91 98866 30291",
    gender: "FEMALE",
    height: 162,
    dob: "1997-05-30",
    goal: "Build a consistent routine and lose 6 kg",
    planKey: "transformation",
    startOffset: -7,
    status: "TRIAL",
    autoRenew: false,
    startWeight: 74,
    currentWeight: 73.6,
    startBodyFat: 33.9,
    currentBodyFat: 33.4,
    weeks: 1,
    unreviewed: 1,
    feedback: ["First week done! The workouts were tough but I finished all three."],
    notes: ["Trial ends in a week — send the transformation upgrade offer on day 5."],
  },
  {
    name: "Vikram Nair",
    email: "vikram.nair@example.com",
    phone: "+91 99872 14508",
    gender: "MALE",
    height: 175,
    dob: "1983-12-21",
    goal: "Reverse pre-diabetes markers",
    planKey: "transformation",
    startOffset: -98,
    status: "EXPIRED",
    autoRenew: false,
    startWeight: 95.4,
    currentWeight: 84.5,
    startBodyFat: 32.1,
    currentBodyFat: 24.3,
    weeks: 12,
    unreviewed: 0,
    feedback: [
      "HbA1c came back at 5.4 — my doctor was genuinely surprised.",
      "Down two trouser sizes. Family keeps commenting.",
      "Final week. Want to talk about what happens next.",
    ],
    notes: [
      "Programme complete — outstanding result. Ask for a testimonial and a before/after.",
      "Win-back candidate for the elite quarterly plan.",
    ],
  },
  {
    name: "Meera Reddy",
    email: "meera.reddy@example.com",
    phone: "+91 97400 66823",
    gender: "FEMALE",
    height: 168,
    dob: "1993-08-11",
    goal: "Rebuild strength post-partum",
    planKey: "coaching",
    startOffset: -35,
    status: "ACTIVE",
    autoRenew: true,
    startWeight: 66.8,
    currentWeight: 64.8,
    startBodyFat: 30.1,
    currentBodyFat: 27.6,
    weeks: 5,
    unreviewed: 1,
    feedback: [
      "Core work is getting easier. No more coning during planks.",
      "Sleep is broken because of the baby, so sessions were shorter this week.",
      "Managed all three sessions. Feeling like myself again.",
    ],
    notes: [
      "Post-partum, 8 months. Cleared by her physio for loaded work — file on record.",
      "No supine core work before week 8. Progress to dead bugs first.",
    ],
  },
  {
    name: "Dev Kapoor",
    email: "dev.kapoor@example.com",
    phone: "+91 90210 47739",
    gender: "MALE",
    height: 169,
    dob: "1990-02-06",
    goal: "Drop 12 kg before the wedding",
    planKey: "coaching",
    startOffset: -14,
    status: "PAUSED",
    autoRenew: false,
    startWeight: 88.3,
    currentWeight: 87.1,
    startBodyFat: 29.8,
    currentBodyFat: 29.1,
    weeks: 2,
    unreviewed: 0,
    feedback: [
      "Started well but got the flu at the end of the week.",
      "Still recovering. Need to pause for a couple of weeks.",
    ],
    notes: ["Paused for illness on request. Diarise a restart call in two weeks."],
  },
  {
    name: "Ishita Rao",
    email: "ishita.rao@example.com",
    phone: "+91 98330 90514",
    gender: "FEMALE",
    height: 170,
    dob: "1995-06-19",
    goal: "Sub-4-hour marathon with strength support",
    planKey: "elite",
    startOffset: -82,
    status: "ACTIVE",
    autoRenew: false,
    startWeight: 58.9,
    currentWeight: 56.4,
    startBodyFat: 22.4,
    currentBodyFat: 19.1,
    weeks: 11,
    unreviewed: 0,
    overdueWeeks: 1,
    feedback: [
      "18 km long run at 5:40/km and legs felt fresh the next day.",
      "Strength sessions are not interfering with running any more.",
      "Tapering week. Feeling twitchy but following the plan.",
    ],
    notes: [
      "Race in 5 weeks. Reduce lower-body volume from week 10.",
      "Subscription ends soon — pitch the post-race off-season block.",
    ],
  },
  {
    name: "Rohan Desai",
    email: "rohan.desai@example.com",
    phone: "+91 99671 33802",
    gender: "MALE",
    height: 183,
    dob: "1992-10-27",
    goal: "Decide between fat loss and strength focus",
    planKey: "consult",
    startOffset: -3,
    status: "ACTIVE",
    autoRenew: false,
    startWeight: 92,
    currentWeight: 92,
    startBodyFat: 26,
    currentBodyFat: 26,
    weeks: 0,
    unreviewed: 0,
    feedback: [],
    notes: ["Consultation booked. Strong candidate for the 12-week transformation."],
  },
  {
    name: "Neha Bansal",
    email: "neha.bansal@example.com",
    phone: "+91 98455 27390",
    gender: "FEMALE",
    height: 160,
    dob: "1996-04-03",
    goal: "Fat loss without giving up home-cooked food",
    planKey: "nutrition",
    startOffset: -56,
    status: "CANCELLED",
    autoRenew: false,
    startWeight: 78.2,
    currentWeight: 75.2,
    startBodyFat: 36.8,
    currentBodyFat: 34.2,
    weeks: 6,
    unreviewed: 0,
    feedback: [
      "Down 3 kg. The dal-and-roti template fits my house perfectly.",
      "Relocating to Pune and taking a break from coaching for now.",
    ],
    notes: ["Cancelled for relocation, not dissatisfaction. Good win-back in 3 months."],
  },
];

/* ── plans ─────────────────────────────────────────────────── */

const PLANS = [
  {
    key: "transformation",
    name: "12 Week Transformation",
    description:
      "The flagship programme. Personalised training, nutrition targets, weekly check-ins and a fortnightly progress call. Built for a visible, measurable change in twelve weeks.",
    planType: "TRANSFORMATION" as PlanType,
    durationDays: 84,
    price: 15000,
    billingInterval: "ONE_TIME" as BillingInterval,
  },
  {
    key: "coaching",
    name: "1:1 Online Coaching",
    description:
      "Ongoing month-to-month coaching. Training that adapts every four weeks, nutrition guidance, weekly check-ins and unlimited async support.",
    planType: "ONE_TO_ONE_COACHING" as PlanType,
    durationDays: 30,
    price: 10000,
    billingInterval: "MONTHLY" as BillingInterval,
  },
  {
    key: "nutrition",
    name: "Nutrition Coaching",
    description:
      "Nutrition only, for clients who already have training handled. Macro targets, a practical meal framework and weekly accountability.",
    planType: "NUTRITION_COACHING" as PlanType,
    durationDays: 30,
    price: 5000,
    billingInterval: "MONTHLY" as BillingInterval,
  },
  {
    key: "elite",
    name: "Elite Quarterly Coaching",
    description:
      "Everything in 1:1 coaching plus twice-monthly video calls, priority response and quarterly programme design. Limited to twelve clients at a time.",
    planType: "ONE_TO_ONE_COACHING" as PlanType,
    durationDays: 90,
    price: 27000,
    billingInterval: "QUARTERLY" as BillingInterval,
  },
  {
    key: "consult",
    name: "Strategy Consultation",
    description:
      "A single 45-minute call. Goal audit, training and nutrition review, and a written plan of action you can run yourself.",
    planType: "CONSULTATION" as PlanType,
    durationDays: 7,
    price: 1500,
    billingInterval: "ONE_TIME" as BillingInterval,
  },
];

const WORKOUTS: Record<
  string,
  {
    name: string;
    description: string;
    days: {
      title: string;
      dayOfWeek: number;
      focus: string;
      exercises: [string, number, string, number, string][];
    }[];
  }
> = {
  transformation: {
    name: "Transformation — Upper/Lower Split",
    description:
      "Four training days a week alternating upper and lower body, with progressive overload on the primary lifts and 8–10k steps on rest days.",
    days: [
      {
        title: "Upper Body A",
        dayOfWeek: 1,
        focus: "Push emphasis",
        exercises: [
          ["Barbell Bench Press", 4, "8-10", 120, "Two-second lower, drive the floor away."],
          ["Lat Pulldown", 3, "10-12", 90, "Lead with the elbows, not the hands."],
          ["Seated Shoulder Press", 3, "10", 90, "Stop one rep short of failure."],
          ["Cable Row", 3, "12", 75, "Squeeze for a beat at the back."],
          ["Lateral Raise", 3, "15", 45, "Light weight, no swinging."],
        ],
      },
      {
        title: "Lower Body A",
        dayOfWeek: 2,
        focus: "Squat emphasis",
        exercises: [
          ["Back Squat", 4, "6-8", 150, "Depth over load. Film the last set."],
          ["Romanian Deadlift", 3, "10", 120, "Hinge, do not squat it down."],
          ["Walking Lunge", 3, "12 each", 90, "Long stride, upright torso."],
          ["Leg Curl", 3, "12-15", 60, "Control the return."],
          ["Standing Calf Raise", 4, "15", 45, "Full stretch at the bottom."],
        ],
      },
      {
        title: "Upper Body B",
        dayOfWeek: 4,
        focus: "Pull emphasis",
        exercises: [
          ["Weighted Pull-up", 4, "6-8", 150, "Band-assisted if you cannot hit six."],
          ["Incline Dumbbell Press", 3, "10-12", 90, "30-degree bench, no higher."],
          ["Chest-Supported Row", 3, "12", 90, "Chest stays glued to the pad."],
          ["Face Pull", 3, "15", 60, "Pull to the forehead, thumbs back."],
          ["Cable Curl", 3, "12", 45, "Elbows pinned to your sides."],
        ],
      },
      {
        title: "Lower Body B",
        dayOfWeek: 5,
        focus: "Hinge emphasis",
        exercises: [
          ["Deadlift", 4, "5", 180, "Reset every rep. Quality over speed."],
          ["Bulgarian Split Squat", 3, "10 each", 90, "Front foot flat, knee tracks the toes."],
          ["Hip Thrust", 3, "12", 90, "Chin tucked, ribs down."],
          ["Leg Extension", 3, "15", 60, "One-second squeeze at the top."],
          ["Hanging Knee Raise", 3, "12", 60, "No swinging — control the descent."],
        ],
      },
    ],
  },
  coaching: {
    name: "Adaptive Push / Pull / Legs",
    description:
      "A three-day rotation reviewed every four weeks. Session length is 50–60 minutes, designed to fit around a full working week.",
    days: [
      {
        title: "Push",
        dayOfWeek: 1,
        focus: "Chest, shoulders, triceps",
        exercises: [
          ["Incline Barbell Press", 4, "8", 120, "Elbows at 45 degrees."],
          ["Dumbbell Shoulder Press", 3, "10", 90, "Full lockout each rep."],
          ["Cable Fly", 3, "12-15", 60, "Think hugging, not pressing."],
          ["Overhead Triceps Extension", 3, "12", 60, "Deep stretch at the bottom."],
        ],
      },
      {
        title: "Pull",
        dayOfWeek: 3,
        focus: "Back and biceps",
        exercises: [
          ["Barbell Row", 4, "8", 120, "Torso at 45 degrees, no jerking."],
          ["Lat Pulldown", 3, "10-12", 90, "Slow on the way up."],
          ["Seated Cable Row", 3, "12", 75, "Do not lean back to move the weight."],
          ["Incline Dumbbell Curl", 3, "12", 60, "Full stretch at the bottom."],
        ],
      },
      {
        title: "Legs",
        dayOfWeek: 5,
        focus: "Full lower body",
        exercises: [
          ["Front Squat", 4, "6-8", 150, "Elbows high throughout."],
          ["Romanian Deadlift", 3, "10", 120, "Feel it in the hamstrings, not the back."],
          ["Leg Press", 3, "12", 90, "Do not lock out hard."],
          ["Seated Calf Raise", 4, "15", 45, "Pause at the top."],
        ],
      },
    ],
  },
  elite: {
    name: "Elite — Strength & Conditioning Block",
    description:
      "Five days a week: three heavy strength sessions plus two conditioning days. Reviewed every fortnight on the progress call.",
    days: [
      {
        title: "Max Effort Lower",
        dayOfWeek: 1,
        focus: "Heavy squat / deadlift",
        exercises: [
          ["Back Squat", 5, "3-5", 180, "Work up to a heavy triple, then back-offs."],
          ["Trap Bar Deadlift", 3, "5", 150, "Explosive concentric."],
          ["Bulgarian Split Squat", 3, "8 each", 90, "Slow eccentric."],
          ["Ab Rollout", 3, "10", 60, "Ribs down, no lower-back arch."],
        ],
      },
      {
        title: "Max Effort Upper",
        dayOfWeek: 2,
        focus: "Heavy press / pull",
        exercises: [
          ["Barbell Bench Press", 5, "3-5", 180, "Pause the last set on the chest."],
          ["Weighted Pull-up", 4, "5", 150, "Add weight before adding reps."],
          ["Overhead Press", 3, "6", 120, "Brace hard, no leg drive."],
          ["Chest-Supported Row", 3, "10", 90, "Strict form."],
        ],
      },
      {
        title: "Conditioning",
        dayOfWeek: 3,
        focus: "Zone 2 + intervals",
        exercises: [
          ["Rower Intervals", 6, "500m", 120, "Hold split within 2 seconds each round."],
          ["Sled Push", 5, "20m", 90, "Low body angle, short steps."],
          ["Farmer Carry", 4, "40m", 90, "Shoulders back, do not rush."],
        ],
      },
      {
        title: "Repetition Upper",
        dayOfWeek: 5,
        focus: "Volume and hypertrophy",
        exercises: [
          ["Incline Dumbbell Press", 4, "10-12", 90, "Leave one rep in reserve."],
          ["Cable Row", 4, "12", 75, "Pause at the sternum."],
          ["Lateral Raise", 4, "15", 45, "Strict. No momentum."],
          ["Cable Curl", 3, "12-15", 45, "Constant tension throughout."],
        ],
      },
      {
        title: "Accessory & Mobility",
        dayOfWeek: 6,
        focus: "Hips, core, shoulders",
        exercises: [
          ["Hip Thrust", 4, "12", 90, "Two-second hold at lockout."],
          ["Copenhagen Plank", 3, "30s each", 60, "Build the time slowly."],
          ["Face Pull", 3, "15", 45, "External rotation at the end range."],
          ["90/90 Hip Switch", 3, "10 each", 45, "Slow and controlled."],
        ],
      },
    ],
  },
};

const DIETS: Record<
  string,
  {
    name: string;
    description: string;
    kcal: number;
    p: number;
    c: number;
    f: number;
    meals: [string, string, string, number, number][];
  }
> = {
  transformation: {
    name: "Transformation Nutrition — Moderate Deficit",
    description:
      "A 500 kcal deficit built around Indian home cooking. Protein is the non-negotiable; carbs sit around training. Two flexible meals a week are built in on purpose.",
    kcal: 2200,
    p: 160,
    c: 220,
    f: 70,
    meals: [
      [
        "Breakfast",
        "7:30 – 8:30 AM",
        "4 egg whites + 2 whole eggs, 2 multigrain rotis, a bowl of curd. Black coffee if you want it.",
        480,
        38,
      ],
      [
        "Lunch",
        "1:00 – 2:00 PM",
        "150 g grilled chicken or 200 g paneer, 1 cup rice, dal, a large salad with lemon.",
        700,
        52,
      ],
      [
        "Pre-workout",
        "5:00 – 5:30 PM",
        "1 banana with a scoop of whey, or a fruit-and-oats bowl.",
        300,
        28,
      ],
      [
        "Dinner",
        "8:30 – 9:30 PM",
        "Grilled fish or rajma, 2 rotis, sautéed vegetables in 1 tsp ghee.",
        620,
        42,
      ],
      [
        "Optional",
        "Anytime",
        "100 g Greek yoghurt if you are still hungry. Do not skip meals to save calories.",
        100,
        10,
      ],
    ],
  },
  coaching: {
    name: "Coaching Nutrition — Maintenance Plus",
    description:
      "Calories set just above maintenance to support training while keeping body composition steady. Adjusted every four weeks based on your check-in trend.",
    kcal: 2450,
    p: 170,
    c: 260,
    f: 75,
    meals: [
      [
        "Breakfast",
        "8:00 – 9:00 AM",
        "Oats with milk, whey and berries. Add peanut butter if calories are low.",
        550,
        42,
      ],
      ["Lunch", "1:00 – 2:00 PM", "Chicken or soya, 1.5 cups rice, dal, vegetables.", 780, 55],
      ["Snack", "5:00 PM", "Sprouts chaat or a protein shake with a handful of almonds.", 350, 30],
      ["Dinner", "8:30 – 9:30 PM", "Paneer bhurji or eggs, 2 rotis, salad.", 700, 45],
    ],
  },
  nutrition: {
    name: "Nutrition Coaching — Vegetarian Fat Loss",
    description:
      "A vegetarian-first framework designed around what is already cooked at home. No separate meals, no exotic ingredients — portion structure does the work.",
    kcal: 1750,
    p: 120,
    c: 165,
    f: 55,
    meals: [
      [
        "Breakfast",
        "7:30 – 8:30 AM",
        "Moong dal chilla with curd, or poha with peanuts and a glass of milk.",
        420,
        26,
      ],
      [
        "Lunch",
        "1:00 – 2:00 PM",
        "2 rotis, dal, 100 g paneer or tofu sabzi, salad first.",
        580,
        38,
      ],
      ["Snack", "5:00 PM", "Roasted chana or a whey shake. Tea without sugar.", 250, 25],
      [
        "Dinner",
        "8:00 – 9:00 PM",
        "Vegetable khichdi with curd, or soya keema with one roti.",
        500,
        31,
      ],
    ],
  },
  elite: {
    name: "Elite Nutrition — Performance Fuelling",
    description:
      "Periodised around the training week: carbs are pushed towards the heavy days and pulled back on rest days. Hydration and sodium targets included.",
    kcal: 2800,
    p: 190,
    c: 320,
    f: 80,
    meals: [
      [
        "Breakfast",
        "7:00 – 8:00 AM",
        "5 eggs, 3 slices sourdough, avocado, black coffee.",
        700,
        45,
      ],
      ["Pre-training", "11:30 AM", "White rice with honey and a scoop of whey.", 420, 28],
      ["Post-training", "2:00 PM", "Chicken, 2 cups rice, vegetables, olive oil.", 850, 62],
      ["Dinner", "8:30 PM", "Salmon or lean mutton, sweet potato, greens.", 720, 48],
      [
        "Before bed",
        "10:30 PM",
        "Casein or curd. 3 litres water across the day, salt your food.",
        200,
        20,
      ],
    ],
  },
};

/* ── gym tenants ───────────────────────────────────────────── */

type StaffSpec = {
  name: string;
  email: string;
  phone: string;
  role: "GYM_OWNER" | "GYM_STAFF";
  title: string;
  bio?: string;
  specialization?: string;
  experienceYears?: number;
};

type GymSpec = {
  code: string;
  name: string;
  tagline: string;
  description: string;
  amenities: string[];
  openingHours: string;
  city: string;
  /** Map pin on the public directory globe. */
  lat: number;
  lng: number;
  /** Public profile views, so the listing has social proof on day one. */
  views: number;
  address: string;
  phone: string;
  email: string;
  accentColor: string;
  logoText: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  /** Which plan this gym bought. All of them paid. */
  plan: PlanKey;
  /** Days already used up, so the seed has a lapsed gym and a nearly-due one. */
  daysUsed?: number;
  /** Links on the pin — the shortest path from a searcher to the gym's phone. */
  links?: { kind: GymLinkKind; url: string; label?: string; clicks: number }[];
  /** Whether this owner has published their programme prices on the store. */
  publishPrices?: boolean;
  /** Whether the store setup checklist is behind them. */
  storeReady?: boolean;
  foundedDaysAgo: number;
  planKeys: string[];
  staff: StaffSpec[];
  /** Members drawn from the CLIENTS roster above. */
  memberEmails: string[];
  /** Extra members defined inline for the smaller gyms. */
  extraMembers?: ClientSpec[];
  /** Average daily footfall used to generate attendance history. */
  dailyVisits: number;
};

const GYMS: GymSpec[] = [
  {
    code: "IRON-4821",
    name: "Iron Temple Fitness",
    tagline: "Strength is earned, never given.",
    description:
      "A serious strength gym in Andheri West with a full powerlifting rack setup, a dedicated conditioning floor and coaches who actually programme for you.\n\nWe cap membership so the floor never gets crowded at 7pm. Walk in for a trial session any weekday.",
    amenities: [
      "Powerlifting racks",
      "Cardio floor",
      "Personal training",
      "Showers",
      "Parking",
      "Air conditioned",
    ],
    openingHours: "Mon–Sat 5:30am–10:30pm · Sun 7am–1pm",
    city: "Mumbai",
    lat: 19.1364,
    lng: 72.8296,
    views: 1284,
    address: "2nd Floor, Sunbeam Arcade, Andheri West, Mumbai 400053",
    phone: "+91 22 4890 1200",
    email: "front-desk@irontemple.fit",
    accentColor: "#7c6cff",
    logoText: "IT",
    status: "ACTIVE",
    plan: "ANNUAL",
    // The only gym whose owner has been in and set their own prices.
    publishPrices: true,
    storeReady: true,
    links: [
      { kind: "WEBSITE", url: "https://irontemple.fit", label: "Book a trial", clicks: 412 },
      { kind: "INSTAGRAM", url: "https://instagram.com/irontemple.fit", clicks: 288 },
      { kind: "WHATSAPP", url: "https://wa.me/912248901200", clicks: 176 },
    ],
    foundedDaysAgo: 640,
    planKeys: ["transformation", "coaching", "nutrition", "elite", "consult"],
    staff: [
      {
        name: "Rohit Malhotra",
        email: "rohit@irontemple.fit",
        phone: "+91 98200 10001",
        role: "GYM_OWNER",
        title: "Founder & Head Coach",
        bio: "Opened Iron Temple in 2024 after a decade of coaching. Runs the floor, the numbers and the hardest sessions of the week.",
        specialization: "Strength & powerlifting",
        experienceYears: 12,
      },
      {
        name: "Alex Morgan",
        email: "alex@irontemple.fit",
        phone: "+91 98670 10101",
        role: "GYM_STAFF",
        title: "Head of Online Coaching",
        bio: "Online fitness coach working with busy professionals on fat loss, strength and long-term habits. Over 400 clients coached since 2018.",
        specialization: "Fat loss, strength & body recomposition",
        experienceYears: 8,
      },
      {
        name: "Farah Sheikh",
        email: "farah@irontemple.fit",
        phone: "+91 99303 10102",
        role: "GYM_STAFF",
        title: "Front Desk Manager",
        specialization: "Memberships & member care",
        experienceYears: 4,
      },
    ],
    memberEmails: CLIENTS.map((c) => c.email),
    dailyVisits: 38,
  },
  {
    code: "TITAN-2093",
    name: "Titan Strength Club",
    tagline: "Built for the long haul.",
    description:
      "A small, serious strength club in Indiranagar. Two coaches, calibrated plates and no queues for the bar.\n\nWe work with people who want to get strong and stay healthy for decades, not for a wedding.",
    amenities: ["Strength training", "Coached sessions", "Showers", "Cycle parking"],
    openingHours: "Mon–Sat 6am–10pm · Sun closed",
    city: "Bengaluru",
    lat: 12.9784,
    lng: 77.6408,
    views: 742,
    address: "14, 5th Cross, Indiranagar, Bengaluru 560038",
    phone: "+91 80 4102 7788",
    email: "hello@titanstrength.in",
    accentColor: "#2dd4bf",
    logoText: "TS",
    status: "ACTIVE",
    plan: "SEMIANNUAL",
    // Prices unpublished on purpose: the store shows "Ask the gym".
    publishPrices: false,
    storeReady: true,
    links: [
      { kind: "INSTAGRAM", url: "https://instagram.com/titanstrength.in", clicks: 143 },
      { kind: "MAPS", url: "https://maps.google.com/?q=Titan+Strength+Club", clicks: 61 },
    ],
    foundedDaysAgo: 210,
    planKeys: ["coaching", "nutrition", "consult"],
    staff: [
      {
        name: "Sneha Kulkarni",
        email: "sneha@titanstrength.in",
        phone: "+91 99001 20001",
        role: "GYM_OWNER",
        title: "Owner",
        bio: "Ex-national level swimmer running a small, serious strength club in Indiranagar.",
        specialization: "Strength & conditioning",
        experienceYears: 7,
      },
      {
        name: "Arjun Pillai",
        email: "arjun@titanstrength.in",
        phone: "+91 99001 20002",
        role: "GYM_STAFF",
        title: "Coach",
        specialization: "Hypertrophy",
        experienceYears: 3,
      },
    ],
    memberEmails: [],
    extraMembers: [
      {
        name: "Tanvi Deshpande",
        email: "tanvi.deshpande@example.com",
        phone: "+91 98450 33110",
        gender: "FEMALE",
        height: 163,
        dob: "1996-02-12",
        goal: "Build strength and stop lower-back pain",
        planKey: "coaching",
        startOffset: -56,
        status: "ACTIVE",
        autoRenew: true,
        startWeight: 64.2,
        currentWeight: 62.1,
        startBodyFat: 29.4,
        currentBodyFat: 26.2,
        weeks: 8,
        unreviewed: 1,
        feedback: [
          "Back felt fine all week for the first time in months.",
          "Deadlifted 70 kg for 5. Very happy with that.",
          "Busy sprint at work, only made it in twice.",
        ],
        notes: [
          "Physio cleared her for loaded hinging. Keep progression slow.",
          "Very consistent — good candidate for the PT upsell.",
        ],
      },
      {
        name: "Karthik Nambiar",
        email: "karthik.nambiar@example.com",
        phone: "+91 98450 33111",
        gender: "MALE",
        height: 177,
        dob: "1991-09-04",
        goal: "Get back under 80 kg",
        planKey: "coaching",
        startOffset: -84,
        status: "ACTIVE",
        autoRenew: true,
        startWeight: 88.6,
        currentWeight: 82.3,
        startBodyFat: 28.9,
        currentBodyFat: 23.1,
        weeks: 12,
        unreviewed: 0,
        overdueWeeks: 1,
        feedback: [
          "Down another kilo. Trousers are loose.",
          "Travel week — managed hotel gym three times.",
          "Best month so far. Sleep is the difference.",
        ],
        notes: [
          "Responds well to step targets over cardio sessions.",
          "Renewal conversation due in three weeks.",
        ],
      },
      {
        name: "Ritika Agarwal",
        email: "ritika.agarwal@example.com",
        phone: "+91 98450 33112",
        gender: "FEMALE",
        height: 158,
        dob: "1999-11-27",
        goal: "First pull-up and general conditioning",
        planKey: "nutrition",
        startOffset: -28,
        status: "ACTIVE",
        autoRenew: false,
        startWeight: 57.8,
        currentWeight: 56.9,
        startBodyFat: 27.1,
        currentBodyFat: 25.4,
        weeks: 4,
        unreviewed: 1,
        feedback: [
          "Band-assisted pull-ups are getting easier.",
          "Eating enough protein is still the hard part.",
        ],
        notes: ["Nutrition-only for now. Wants to add training in the new year."],
      },
      {
        name: "Sameer Bhatt",
        email: "sameer.bhatt@example.com",
        phone: "+91 98450 33113",
        gender: "MALE",
        height: 182,
        dob: "1987-06-15",
        goal: "Stay healthy around a desk job",
        planKey: "coaching",
        startOffset: -14,
        status: "TRIAL",
        autoRenew: false,
        startWeight: 93.1,
        currentWeight: 92.4,
        startBodyFat: 30.2,
        currentBodyFat: 29.8,
        weeks: 2,
        unreviewed: 1,
        feedback: ["Two sessions done. Sore but good.", "Learning the lifts. Form work mostly."],
        notes: ["Trial ends soon — send the annual offer."],
      },
      {
        name: "Divya Menon",
        email: "divya.menon@example.com",
        phone: "+91 98450 33114",
        gender: "FEMALE",
        height: 166,
        dob: "1994-04-08",
        goal: "Half marathon in April",
        planKey: "coaching",
        startOffset: -119,
        status: "EXPIRED",
        autoRenew: false,
        startWeight: 60.4,
        currentWeight: 57.8,
        startBodyFat: 25.6,
        currentBodyFat: 21.3,
        weeks: 14,
        unreviewed: 0,
        feedback: ["Race done — 1:58. Thank you!", "Taper week, feeling fresh."],
        notes: ["Finished her block. Win-back for the off-season programme."],
      },
      {
        name: "Aditya Rane",
        email: "aditya.rane@example.com",
        phone: "+91 98450 33115",
        gender: "MALE",
        height: 174,
        dob: "2000-01-19",
        goal: "Put on 8 kg of muscle",
        planKey: "coaching",
        startOffset: -42,
        status: "ACTIVE",
        autoRenew: true,
        startWeight: 58.9,
        currentWeight: 62.4,
        startBodyFat: 12.8,
        currentBodyFat: 14.9,
        weeks: 6,
        unreviewed: 0,
        feedback: [
          "Eating is a full-time job but the scale is moving.",
          "Bench up 10 kg since starting.",
        ],
        notes: ["Classic hardgainer. Hold calories even if fat gain shows."],
      },
      {
        name: "Pooja Salvi",
        email: "pooja.salvi@example.com",
        phone: "+91 98450 33116",
        gender: "FEMALE",
        height: 161,
        dob: "1989-08-23",
        goal: "Consistency after a long break",
        planKey: "nutrition",
        startOffset: -21,
        status: "PAUSED",
        autoRenew: false,
        startWeight: 70.2,
        currentWeight: 69.6,
        startBodyFat: 32.8,
        currentBodyFat: 32.1,
        weeks: 3,
        unreviewed: 0,
        feedback: ["Started well.", "Kids fell ill — paused for now."],
        notes: ["Paused on request. Follow up in two weeks."],
      },
    ],
    dailyVisits: 17,
  },
  {
    code: "PULSE-7756",
    name: "Pulse Fitness Studio",
    tagline: "Small studio. Serious results.",
    description:
      "A boutique studio in Koregaon Park running small group classes and one-to-one coaching. New, hungry, and taking on founding members.",
    amenities: ["Group classes", "Personal training", "Functional floor"],
    openingHours: "Mon–Sat 6am–9pm",
    city: "Pune",
    lat: 18.5362,
    lng: 73.8939,
    views: 389,
    address: "Shop 4, Lane 6, Koregaon Park, Pune 411001",
    phone: "+91 20 6677 4410",
    email: "team@pulsestudio.in",
    accentColor: "#f0b24a",
    logoText: "PF",
    status: "ACTIVE",
    plan: "MONTHLY",
    // Three days left, so the "renew soon" nudge has somewhere to show.
    daysUsed: 27,
    publishPrices: false,
    // Deliberately half-finished, so the store setup checklist has something
    // to nag about.
    storeReady: false,
    links: [{ kind: "INSTAGRAM", url: "https://instagram.com/pulsestudio.pune", clicks: 37 }],
    foundedDaysAgo: 24,
    planKeys: ["coaching", "consult"],
    staff: [
      {
        name: "Imran Qureshi",
        email: "imran@pulsestudio.in",
        phone: "+91 90280 40001",
        role: "GYM_OWNER",
        title: "Owner & Coach",
        bio: "Opened Pulse three weeks ago. Two trainers, forty members and a lot of ambition.",
        specialization: "Group training",
        experienceYears: 5,
      },
    ],
    memberEmails: [],
    extraMembers: [
      {
        name: "Nikhil Verma",
        email: "nikhil.verma@example.com",
        phone: "+91 98111 22334",
        gender: "MALE",
        height: 176,
        dob: "1993-03-30",
        goal: "Lose 10 kg before the wedding",
        planKey: "coaching",
        startOffset: -18,
        status: "ACTIVE",
        autoRenew: true,
        startWeight: 89.4,
        currentWeight: 87.1,
        startBodyFat: 29.6,
        currentBodyFat: 28.2,
        weeks: 3,
        unreviewed: 1,
        feedback: [
          "Three sessions every week so far.",
          "Cutting out the evening snacking was the big one.",
        ],
        notes: ["Motivated and on a deadline. Keep the wins visible."],
      },
      {
        name: "Shreya Kapadia",
        email: "shreya.kapadia@example.com",
        phone: "+91 98111 22335",
        gender: "FEMALE",
        height: 160,
        dob: "1997-12-05",
        goal: "Tone up and build a habit",
        planKey: "coaching",
        startOffset: -11,
        status: "ACTIVE",
        autoRenew: false,
        startWeight: 61.7,
        currentWeight: 61.2,
        startBodyFat: 28.3,
        currentBodyFat: 27.9,
        weeks: 2,
        unreviewed: 1,
        feedback: ["Enjoying the group classes.", "Getting used to the early mornings."],
        notes: ["New to training. Prioritise technique and confidence."],
      },
      {
        name: "Manav Chitale",
        email: "manav.chitale@example.com",
        phone: "+91 98111 22336",
        gender: "MALE",
        height: 171,
        dob: "1985-07-14",
        goal: "Manage blood pressure",
        planKey: "consult",
        startOffset: -5,
        status: "ACTIVE",
        autoRenew: false,
        startWeight: 84.5,
        currentWeight: 84.5,
        startBodyFat: 27.4,
        currentBodyFat: 27.4,
        weeks: 0,
        unreviewed: 0,
        feedback: [],
        notes: ["Consultation booked. Doctor's note on file — keep intensity moderate."],
      },
    ],
    dailyVisits: 9,
  },
];

/* ── seeding ───────────────────────────────────────────────── */

async function reset() {
  // Order matters — the historical tables use onDelete: Restrict.
  await db.platformOrder.deleteMany();
  await db.trainerNote.deleteMany();
  await db.payment.deleteMany();
  await db.subscription.deleteMany();
  await db.attendance.deleteMany();
  await db.exerciseLog.deleteMany();
  await db.exercise.deleteMany();
  await db.workoutDay.deleteMany();
  await db.workoutPlan.deleteMany();
  await db.mealGuideline.deleteMany();
  await db.dietPlan.deleteMany();
  await db.gymLink.deleteMany();
  await db.plan.deleteMany();
  await db.clientProfile.deleteMany();
  await db.trainerProfile.deleteMany();
  await db.user.deleteMany();
  await db.gym.deleteMany();
}

let txCounter = 4180;
const paymentMethods: PaymentMethod[] = ["UPI", "CARD", "NET_BANKING", "BANK_TRANSFER"];

async function seedGym(spec: GymSpec, passwordHash: string) {
  const gym = await db.gym.create({
    data: {
      code: spec.code,
      name: spec.name,
      tagline: spec.tagline,
      city: spec.city,
      address: spec.address,
      phone: spec.phone,
      email: spec.email,
      accentColor: spec.accentColor,
      logoText: spec.logoText,
      description: spec.description,
      amenities: spec.amenities,
      openingHours: spec.openingHours,
      latitude: spec.lat,
      longitude: spec.lng,
      country: locate(spec.city)?.country ?? null,
      currency: currencyForCity(spec.city),
      viewCount: spec.views,
      storeSetupAt: spec.storeReady ? daysFromToday(-spec.foundedDaysAgo + 1) : null,
      listed: true,
      status: spec.status,
      tier: tierFor(spec.plan),
      accessExpiresAt: extendAccess(
        daysFromToday(-(spec.daysUsed ?? 0)),
        spec.plan,
        daysFromToday(-(spec.daysUsed ?? 0)),
      ),
      trialEndsAt: spec.status === "TRIAL" ? daysFromToday(14 - spec.foundedDaysAgo + 24) : null,
      createdAt: daysFromToday(-spec.foundedDaysAgo),
    },
  });

  // ── staff ──────────────────────────────────────────────────
  const staffIds: string[] = [];
  for (const person of spec.staff) {
    const user = await db.user.create({
      data: {
        gymId: gym.id,
        name: person.name,
        email: person.email,
        phone: person.phone,
        passwordHash,
        role: person.role,
        createdAt: daysFromToday(-spec.foundedDaysAgo + 1),
        lastLoginAt: daysFromToday(-Math.floor(rand() * 3)),
        trainerProfile: {
          create: {
            gymId: gym.id,
            title: person.title,
            bio: person.bio ?? null,
            specialization: person.specialization ?? null,
            experienceYears: person.experienceYears ?? null,
          },
        },
      },
      include: { trainerProfile: true },
    });
    staffIds.push(user.trainerProfile!.id);
  }
  // Coaches own the programmes; the front-desk manager does not.
  const coachId = staffIds[1] ?? staffIds[0];

  for (const [i, link] of (spec.links ?? []).entries()) {
    await db.gymLink.create({
      data: {
        gymId: gym.id,
        kind: link.kind,
        label: link.label ?? null,
        url: link.url,
        clickCount: link.clicks,
        sortOrder: i,
      },
    });
  }

  // ── plans, with workout and diet templates ─────────────────
  const planIds: Record<string, string> = {};
  for (const key of spec.planKeys) {
    const p = PLANS.find((x) => x.key === key)!;
    const plan = await db.plan.create({
      data: {
        gymId: gym.id,
        trainerId: coachId,
        name: p.name,
        description: p.description,
        planType: p.planType,
        durationDays: p.durationDays,
        price: p.price,
        billingInterval: p.billingInterval,
        showPrice: spec.publishPrices ?? false,
        createdAt: daysFromToday(-spec.foundedDaysAgo + 2),
      },
    });
    planIds[key] = plan.id;

    const w = WORKOUTS[key];
    if (w) {
      const wp = await db.workoutPlan.create({
        data: { planId: plan.id, name: w.name, description: w.description },
      });
      for (const [i, day] of w.days.entries()) {
        const wd = await db.workoutDay.create({
          data: {
            workoutPlanId: wp.id,
            title: day.title,
            dayOfWeek: day.dayOfWeek,
            focus: day.focus,
            sortOrder: i,
          },
        });
        await db.exercise.createMany({
          data: day.exercises.map(([name, sets, reps, rest, cue], j) => ({
            workoutDayId: wd.id,
            name,
            sets,
            reps,
            restSeconds: rest,
            coachCue: cue,
            sortOrder: j,
          })),
        });
      }
    }

    const d = DIETS[key];
    if (d) {
      const dp = await db.dietPlan.create({
        data: {
          planId: plan.id,
          name: d.name,
          description: d.description,
          caloriesTarget: d.kcal,
          proteinTarget: d.p,
          carbsTarget: d.c,
          fatsTarget: d.f,
        },
      });
      await db.mealGuideline.createMany({
        data: d.meals.map(([title, timing, description, calories, protein], i) => ({
          dietPlanId: dp.id,
          title,
          timing,
          description,
          calories,
          protein,
          sortOrder: i,
        })),
      });
    }
  }

  // ── members ────────────────────────────────────────────────
  const roster: ClientSpec[] = [
    ...spec.memberEmails.map((e) => CLIENTS.find((c) => c.email === e)!).filter(Boolean),
    ...(spec.extraMembers ?? []),
  ];

  const memberIds: string[] = [];
  for (const [index, m] of roster.entries()) {
    if (!planIds[m.planKey]) continue;
    const plan = PLANS.find((p) => p.key === m.planKey)!;
    const memberCode = `M-${String(index + 1).padStart(4, "0")}`;

    const user = await db.user.create({
      data: {
        gymId: gym.id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        passwordHash,
        role: "MEMBER",
        createdAt: daysFromToday(m.startOffset - (m.priorPlanKey ? 100 : 2)),
        lastLoginAt: daysFromToday(-Math.floor(rand() * 5)),
        clientProfile: {
          create: {
            gymId: gym.id,
            memberCode,
            trainerId: coachId,
            dateOfBirth: new Date(m.dob),
            gender: m.gender,
            height: m.height,
            fitnessGoal: m.goal,
          },
        },
      },
      include: { clientProfile: true },
    });
    const clientId = user.clientProfile!.id;
    memberIds.push(clientId);

    // A previous, completed subscription on another plan (Client M:N Plan).
    if (m.priorPlanKey && planIds[m.priorPlanKey]) {
      const priorPlan = PLANS.find((p) => p.key === m.priorPlanKey)!;
      const prior = await db.subscription.create({
        data: {
          clientId,
          planId: planIds[m.priorPlanKey],
          startDate: dayOnly(m.startOffset - priorPlan.durationDays - 2),
          endDate: dayOnly(m.startOffset - 2),
          status: "EXPIRED",
          autoRenew: false,
          price: priorPlan.price,
          currency: gym.currency,
        },
      });
      await db.payment.create({
        data: {
          subscriptionId: prior.id,
          amount: priorPlan.price,
          currency: gym.currency,
          paymentDate: daysFromToday(m.startOffset - priorPlan.durationDays - 2),
          paymentMethod: "UPI",
          transactionId: `TXN${txCounter++}`,
          status: "SUCCESSFUL",
        },
      });
    }

    const subscription = await db.subscription.create({
      data: {
        clientId,
        planId: planIds[m.planKey],
        startDate: dayOnly(m.startOffset),
        endDate: dayOnly(m.startOffset + plan.durationDays),
        status: m.status,
        autoRenew: m.autoRenew,
        price: plan.price,
        currency: gym.currency,
      },
    });

    // Payments: one per elapsed billing cycle.
    const elapsed = Math.abs(m.startOffset);
    const cycleDays =
      plan.billingInterval === "MONTHLY"
        ? 30
        : plan.billingInterval === "QUARTERLY"
          ? 90
          : plan.durationDays;
    const cycles =
      plan.billingInterval === "ONE_TIME" ? 1 : Math.max(1, Math.floor(elapsed / cycleDays) + 1);

    for (let c = 0; c < cycles; c++) {
      const offset = m.startOffset + c * cycleDays;
      if (offset > 0) break;
      let status: PaymentStatus = "SUCCESSFUL";
      if (m.status === "TRIAL") status = "PENDING";
      else if (m.name === "Dev Kapoor" || m.name === "Sameer Bhatt") status = "FAILED";
      else if ((m.name === "Meera Reddy" || m.name === "Ritika Agarwal") && c === cycles - 1)
        status = "PENDING";
      await db.payment.create({
        data: {
          subscriptionId: subscription.id,
          amount: plan.price,
          currency: gym.currency,
          paymentDate: daysFromToday(offset),
          paymentMethod: paymentMethods[Math.floor(rand() * paymentMethods.length)],
          transactionId: `TXN${txCounter++}`,
          status,
        },
      });
    }

    // Private staff notes.
    for (const [i, note] of m.notes.entries()) {
      await db.trainerNote.create({
        data: {
          trainerId: coachId,
          clientId,
          note,
          createdAt: daysFromToday(-(m.notes.length - i) * 6),
        },
      });
    }
  }

  // ── attendance: a year of floor traffic ────────────────────
  if (memberIds.length > 0) {
    const rows: {
      gymId: string;
      memberId: string;
      checkInAt: Date;
      checkOutAt: Date | null;
      source: AttendanceSource;
    }[] = [];
    const sources: AttendanceSource[] = ["FRONT_DESK", "MEMBER_APP", "TURNSTILE"];

    for (let day = 364; day >= 0; day--) {
      const weekday = daysFromToday(-day).getDay();
      // Sunday is quiet; Monday is the busiest day of the week.
      const factor = weekday === 0 ? 0.4 : weekday === 1 ? 1.25 : 1;
      const visits = Math.round(spec.dailyVisits * factor * (0.8 + rand() * 0.4));

      for (let v = 0; v < visits; v++) {
        const memberId = memberIds[Math.floor(rand() * memberIds.length)];
        // Peaks before work and after work.
        const morning = rand() < 0.45;
        const hour = morning ? 6 + Math.floor(rand() * 3) : 17 + Math.floor(rand() * 4);
        const minute = Math.floor(rand() * 60);
        const checkInAt = at(-day, hour, minute);
        const stayMinutes = 45 + Math.floor(rand() * 50);
        const checkOutAt = new Date(checkInAt.getTime() + stayMinutes * 60_000);
        rows.push({
          gymId: gym.id,
          memberId,
          checkInAt,
          checkOutAt,
          source: sources[Math.floor(rand() * sources.length)],
        });
      }
    }
    // Anyone whose visit would still be running right now stays open — but only
    // their latest one, so a member is never "inside" twice at once.
    const openable = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (row.checkOutAt && row.checkOutAt > new Date() && row.checkInAt <= new Date()) {
        const held = openable.get(row.memberId);
        if (!held || row.checkInAt > held.checkInAt) openable.set(row.memberId, row);
      }
    }
    for (const row of rows) {
      if (openable.get(row.memberId) === row) row.checkOutAt = null;
      else if (row.checkOutAt && row.checkOutAt > new Date()) {
        // Close any other overlapping visit at its natural end.
        row.checkOutAt = new Date(Math.min(row.checkOutAt.getTime(), Date.now() - 60_000));
      }
    }

    await db.attendance.createMany({ data: rows });
  }

  return { gym, coachId, planIds, memberIds };
}

/**
 * Listings compiled from public information.
 *
 * The ones with an `owner` were claimed: somebody paid, took the profile over
 * and is on the globe. The ones without are still inventory for "claim this
 * gym" — a page a searcher can reach by link, but no pin, because nobody has
 * paid for one.
 */
const UNCLAIMED: {
  code: string;
  name: string;
  tagline: string;
  description: string;
  amenities: string[];
  openingHours: string;
  city: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  accentColor: string;
  logoText: string;
  views: number;
  /** Present once an owner has claimed and paid for the listing. */
  owner?: { name: string; email: string; phone: string; plan: PlanKey; daysUsed: number };
  links: { kind: GymLinkKind; url: string; label?: string; clicks: number }[];
}[] = [
  {
    code: "APEX-3310",
    name: "Apex Fitness Hub",
    tagline: "Delhi's 24-hour training floor.",
    description:
      "A large mixed-use gym in Lajpat Nagar with free weights, machines and a cardio mezzanine. Open around the clock for shift workers and early risers.\n\nThis listing was compiled from public information. If you run this gym, claim it to edit the details and take enquiries.",
    amenities: ["24-hour access", "Free weights", "Cardio floor", "Steam room", "Parking"],
    openingHours: "Open 24 hours",
    city: "New Delhi",
    lat: 28.5679,
    lng: 77.2431,
    address: "Ring Road, Lajpat Nagar IV, New Delhi 110024",
    phone: "+91 11 4155 6600",
    accentColor: "#f0696f",
    logoText: "AF",
    views: 268,
    owner: {
      name: "Nikhil Bhatia",
      email: "nikhil@apexfitnesshub.in",
      phone: "+91 98110 44526",
      plan: "ANNUAL",
      daysUsed: 96,
    },
    links: [
      { kind: "WEBSITE" as GymLinkKind, url: "https://apexfitnesshub.in", clicks: 96 },
      { kind: "PHONE" as GymLinkKind, url: "tel:+911141556600", clicks: 41 },
    ],
  },
  {
    code: "COAST-5521",
    name: "Coastline CrossFit",
    tagline: "Train hard by the sea.",
    description:
      "A box in Besant Nagar running WODs six days a week, with olympic lifting platforms and an outdoor rig.\n\nThis listing was compiled from public information. If you run this gym, claim it to edit the details and take enquiries.",
    amenities: ["CrossFit box", "Olympic lifting", "Outdoor rig", "Group classes"],
    openingHours: "Mon–Sat 5:30am–9pm",
    city: "Chennai",
    lat: 13.0002,
    lng: 80.2668,
    address: "3rd Avenue, Besant Nagar, Chennai 600090",
    phone: "+91 44 2446 9012",
    accentColor: "#5aa2f5",
    logoText: "CC",
    views: 231,
    links: [
      {
        kind: "INSTAGRAM" as GymLinkKind,
        url: "https://instagram.com/coastlinecrossfit",
        clicks: 74,
      },
    ],
  },
  {
    code: "IRONBANK-2277",
    name: "Ironbank Strength",
    tagline: "Barbells and black coffee since 2014.",
    description:
      "A basement strength gym off Old Street with calibrated plates, six platforms and no queue for the squat rack before 8am.\n\nThis listing was compiled from public information. If you run this gym, claim it to edit the details and take enquiries.",
    amenities: ["Powerlifting platforms", "Strongman kit", "Showers", "Coffee bar"],
    openingHours: "Mon–Fri 6am–10pm · Sat–Sun 8am–6pm",
    city: "London",
    lat: 51.5265,
    lng: -0.0876,
    address: "Arch 12, Bath Street, London EC1V",
    phone: "+44 20 7946 0210",
    accentColor: "#8f9fba",
    logoText: "IB",
    views: 512,
    owner: {
      name: "Owen Whitfield",
      email: "owen@ironbankstrength.co.uk",
      phone: "+44 20 7946 0812",
      plan: "SEMIANNUAL",
      daysUsed: 63,
    },
    links: [
      { kind: "WEBSITE" as GymLinkKind, url: "https://ironbank.london", clicks: 187 },
      {
        kind: "INSTAGRAM" as GymLinkKind,
        url: "https://instagram.com/ironbankstrength",
        clicks: 122,
      },
    ],
  },
  {
    code: "DESERT-6640",
    name: "Desert Iron Club",
    tagline: "Train early, train cold.",
    description:
      "A 24-hour club in Al Quoz with a full free-weights floor, a turf sled track and recovery rooms.\n\nThis listing was compiled from public information. If you run this gym, claim it to edit the details and take enquiries.",
    amenities: ["24-hour access", "Sled track", "Ice bath", "Sauna", "Parking"],
    openingHours: "Open 24 hours",
    city: "Dubai",
    lat: 25.1412,
    lng: 55.2314,
    address: "Warehouse 4, Al Quoz Industrial 3, Dubai",
    phone: "+971 4 320 8811",
    accentColor: "#e8a33d",
    logoText: "DI",
    views: 447,
    owner: {
      name: "Yousef Al Marri",
      email: "yousef@desertironclub.ae",
      phone: "+971 4 399 2210",
      plan: "LIFETIME",
      daysUsed: 148,
    },
    links: [
      { kind: "WEBSITE" as GymLinkKind, url: "https://desertiron.ae", clicks: 151 },
      { kind: "WHATSAPP" as GymLinkKind, url: "https://wa.me/97143208811", clicks: 88 },
    ],
  },
  {
    code: "BOROUGH-9012",
    name: "Borough Barbell",
    tagline: "Brooklyn's oldest lifting room.",
    description:
      "Two floors of iron in Gowanus, coached olympic lifting classes twice a day and open gym the rest of the time.\n\nThis listing was compiled from public information. If you run this gym, claim it to edit the details and take enquiries.",
    amenities: ["Olympic lifting", "Open gym", "Coached classes", "Showers"],
    openingHours: "Mon–Sun 5am–11pm",
    city: "New York",
    lat: 40.6743,
    lng: -73.9899,
    address: "3rd Avenue, Gowanus, Brooklyn, NY 11215",
    phone: "+1 718 555 0142",
    accentColor: "#5aa2f5",
    logoText: "BB",
    views: 389,
    owner: {
      name: "Danielle Ruiz",
      email: "danielle@boroughbarbell.com",
      phone: "+1 212 555 0148",
      plan: "MONTHLY",
      daysUsed: 9,
    },
    links: [
      {
        kind: "INSTAGRAM" as GymLinkKind,
        url: "https://instagram.com/boroughbarbell",
        clicks: 134,
      },
      {
        kind: "MAPS" as GymLinkKind,
        url: "https://maps.google.com/?q=Borough+Barbell+Brooklyn",
        clicks: 45,
      },
    ],
  },
  {
    code: "HARBOUR-4408",
    name: "Harbour Athletic",
    tagline: "Strength by the water.",
    description:
      "A Bondi studio running small-group strength and conditioning, with an outdoor rig facing the beach.\n\nThis listing was compiled from public information. If you run this gym, claim it to edit the details and take enquiries.",
    amenities: ["Small-group training", "Outdoor rig", "Physio", "Showers"],
    openingHours: "Mon–Sat 5:30am–8pm",
    city: "Sydney",
    lat: -33.8908,
    lng: 151.2743,
    address: "Campbell Parade, Bondi Beach, NSW 2026",
    phone: "+61 2 8006 4410",
    accentColor: "#2dd4bf",
    logoText: "HA",
    views: 296,
    owner: {
      name: "Tom Kavanagh",
      email: "tom@harbourathletic.com.au",
      phone: "+61 2 9000 4471",
      plan: "ANNUAL",
      daysUsed: 210,
    },
    links: [{ kind: "WEBSITE" as GymLinkKind, url: "https://harbourathletic.com.au", clicks: 103 }],
  },
  {
    code: "SHAKTI-8804",
    name: "Shakti Wellness & Gym",
    tagline: "Strength, yoga and recovery under one roof.",
    description:
      "A neighbourhood gym in Salt Lake pairing a full weights floor with daily yoga and a physiotherapy room.\n\nThis listing was compiled from public information. If you run this gym, claim it to edit the details and take enquiries.",
    amenities: ["Weights floor", "Yoga studio", "Physiotherapy", "Women's hours"],
    openingHours: "Mon–Sun 5am–10pm",
    city: "Kolkata",
    lat: 22.5804,
    lng: 88.4176,
    address: "Sector V, Salt Lake City, Kolkata 700091",
    phone: "+91 33 4008 2255",
    accentColor: "#3ecf7e",
    logoText: "SW",
    views: 204,
    links: [
      { kind: "WEBSITE" as GymLinkKind, url: "https://shaktiwellness.in", clicks: 58 },
      { kind: "WHATSAPP" as GymLinkKind, url: "https://wa.me/913340082255", clicks: 33 },
    ],
  },
];

async function seedUnclaimed(passwordHash: string) {
  for (const g of UNCLAIMED) {
    const boughtOn = g.owner ? daysFromToday(-g.owner.daysUsed) : null;
    const created = await db.gym.create({
      data: {
        code: g.code,
        name: g.name,
        tagline: g.tagline,
        description: g.description,
        amenities: g.amenities,
        openingHours: g.openingHours,
        city: g.city,
        country: locate(g.city)?.country ?? null,
        currency: currencyForCity(g.city),
        latitude: g.lat,
        longitude: g.lng,
        address: g.address,
        phone: g.phone,
        accentColor: g.accentColor,
        logoText: g.logoText,
        viewCount: g.views,
        // Unclaimed means nobody has paid, and nobody who has not paid is on
        // the globe: the row is a page you can reach by link and claim, not a
        // pin. Claimed ones carry the window their owner bought.
        claimed: Boolean(g.owner),
        listed: true,
        status: "ACTIVE",
        ...(g.owner
          ? {
              tier: tierFor(g.owner.plan),
              accessExpiresAt: extendAccess(null, g.owner.plan, boughtOn!),
            }
          : { accessExpiresAt: null }),
        createdAt: boughtOn ?? daysFromToday(-Math.floor(rand() * 120) - 30),
      },
    });

    if (g.owner) {
      const owner = await db.user.create({
        data: {
          gymId: created.id,
          name: g.owner.name,
          email: g.owner.email,
          phone: g.owner.phone,
          passwordHash,
          role: "GYM_OWNER",
          createdAt: boughtOn!,
          lastLoginAt: daysFromToday(-Math.floor(rand() * 6)),
          trainerProfile: { create: { gymId: created.id, title: "Owner" } },
        },
      });

      await db.platformOrder.create({
        data: {
          userId: owner.id,
          gymId: created.id,
          tier: tierFor(g.owner.plan),
          billingCycle: g.owner.plan,
          amount: orderValue(g.owner.plan),
          currency: "USD",
          status: "PAID",
          provider: "manual",
          kind: "CLAIM",
          gymName: created.name,
          city: created.city,
          createdAt: boughtOn!,
          paidAt: boughtOn!,
        },
      });
    }

    for (const [i, link] of g.links.entries()) {
      await db.gymLink.create({
        data: {
          gymId: created.id,
          kind: link.kind,
          label: link.label ?? null,
          url: link.url,
          clickCount: link.clicks,
          sortOrder: i,
        },
      });
    }
  }
}

/**
 * Paying gyms that never opened the workspace.
 *
 * They bought their window, put their logo on the globe, added their links and
 * left it there. One of them has since lapsed. Between them they are what most
 * of the directory looks like in its first month.
 */
const PIN_ONLY: {
  code: string;
  name: string;
  tagline: string;
  city: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  accentColor: string;
  logoText: string;
  views: number;
  plan: PlanKey;
  /** Days already run down, so the seed has a fresh window and an older one. */
  daysUsed: number;
  owner: { name: string; email: string; phone: string };
  links: { kind: GymLinkKind; url: string; label?: string; clicks: number }[];
}[] = [
  {
    code: "GRIND-6612",
    name: "Grind House Gym",
    tagline: "Old iron, new lifters.",
    city: "Jaipur",
    lat: 26.9124,
    lng: 75.7873,
    address: "Malviya Nagar, Jaipur 302017",
    phone: "+91 141 402 8890",
    accentColor: "#e8a33d",
    logoText: "GH",
    views: 318,
    // Lapsed a fortnight ago: everything is still here, it is just switched
    // off — which is exactly the state the renewal screen exists for.
    plan: "MONTHLY",
    daysUsed: 44,
    owner: { name: "Sanjay Rathore", email: "sanjay@grindhouse.in", phone: "+91 98290 33221" },
    links: [
      {
        kind: "INSTAGRAM",
        url: "https://instagram.com/grindhousejaipur",
        label: "See the floor",
        clicks: 129,
      },
      { kind: "WHATSAPP", url: "https://wa.me/919829033221", label: "Ask about fees", clicks: 87 },
      { kind: "MAPS", url: "https://maps.google.com/?q=Grind+House+Gym+Jaipur", clicks: 44 },
    ],
  },
  {
    code: "NORTH-4471",
    name: "Northside Barbell",
    tagline: "Powerlifting, plain and simple.",
    city: "Toronto",
    lat: 43.6532,
    lng: -79.3832,
    address: "Dupont Street, Toronto, ON",
    phone: "+1 416 555 0188",
    accentColor: "#5aa2f5",
    logoText: "NB",
    views: 264,
    plan: "SEMIANNUAL",
    daysUsed: 41,
    owner: { name: "Marta Nowak", email: "marta@northsidebarbell.ca", phone: "+1 416 555 0188" },
    links: [
      {
        kind: "WEBSITE",
        url: "https://northsidebarbell.ca",
        label: "Membership info",
        clicks: 112,
      },
      { kind: "EMAIL", url: "mailto:marta@northsidebarbell.ca", clicks: 26 },
    ],
  },
];

/**
 * Gyms that paid, pinned themselves on the globe and stopped there — no
 * members, no programmes, just a listing and the links people click. A real
 * share of paying gyms never open the workspace, and the directory has to
 * look right for them too. One of them has let its window run out, so the
 * lapsed state is in the seed rather than only in a test.
 */
async function seedPinOnly(passwordHash: string) {
  for (const spec of PIN_ONLY) {
    const boughtOn = daysFromToday(-spec.daysUsed);
    const gym = await db.gym.create({
      data: {
        code: spec.code,
        name: spec.name,
        tagline: spec.tagline,
        city: spec.city,
        country: locate(spec.city)?.country ?? null,
        currency: currencyForCity(spec.city),
        latitude: spec.lat,
        longitude: spec.lng,
        address: spec.address,
        phone: spec.phone,
        accentColor: spec.accentColor,
        logoText: spec.logoText,
        viewCount: spec.views,
        claimed: true,
        listed: true,
        status: "ACTIVE",
        tier: tierFor(spec.plan),
        accessExpiresAt: extendAccess(null, spec.plan, boughtOn),
        createdAt: boughtOn,
      },
    });

    const owner = await db.user.create({
      data: {
        gymId: gym.id,
        name: spec.owner.name,
        email: spec.owner.email,
        phone: spec.owner.phone,
        passwordHash,
        role: "GYM_OWNER",
        lastLoginAt: daysFromToday(-Math.floor(rand() * 5)),
        // No members to coach yet, but the owner is still staff of their own
        // gym — the profile is what every owner-only screen hangs on.
        trainerProfile: { create: { gymId: gym.id, title: "Owner" } },
      },
    });

    for (const [i, link] of spec.links.entries()) {
      await db.gymLink.create({
        data: {
          gymId: gym.id,
          kind: link.kind,
          label: link.label ?? null,
          url: link.url,
          clickCount: link.clicks,
          sortOrder: i,
        },
      });
    }

    await db.platformOrder.create({
      data: {
        userId: owner.id,
        gymId: gym.id,
        tier: tierFor(spec.plan),
        billingCycle: spec.plan,
        amount: orderValue(spec.plan),
        currency: "USD",
        status: "PAID",
        provider: "manual",
        kind: "LISTING",
        gymName: gym.name,
        city: gym.city,
        createdAt: boughtOn,
        paidAt: boughtOn,
      },
    });
  }
}

async function main() {
  console.log("Resetting database…");
  await reset();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  console.log("Creating platform admin…");
  await db.user.create({
    data: {
      name: "Vraj Soni",
      email: "admin@beongym.in",
      phone: "+91 90000 00001",
      passwordHash,
      role: "SUPER_ADMIN",
      createdAt: daysFromToday(-900),
      lastLoginAt: new Date(),
    },
  });

  console.log("Creating directory listings…");
  await seedUnclaimed(passwordHash);

  console.log("Creating listing-only gyms…");
  await seedPinOnly(passwordHash);

  for (const spec of GYMS) {
    console.log(`Creating gym: ${spec.name} (${spec.code})…`);
    const { gym, coachId, memberIds } = await seedGym(spec, passwordHash);

    // The order that created this gym, so the admin funnel has real history.
    const owner = await db.user.findFirstOrThrow({
      where: { gymId: gym.id, role: "GYM_OWNER" },
      select: { id: true },
    });
    const tierAmount = orderValue(spec.plan);
    await db.platformOrder.create({
      data: {
        userId: owner.id,
        gymId: gym.id,
        tier: tierFor(spec.plan),
        billingCycle: spec.plan,
        amount: tierAmount,
        currency: "USD",
        status: "PAID",
        provider: "manual",
        gymName: spec.name,
        city: spec.city,
        createdAt: daysFromToday(-spec.foundedDaysAgo),
        paidAt: daysFromToday(-spec.foundedDaysAgo),
      },
    });

    // A timetable, and members booked onto it — the class register has to have
    // something in it for the capacity bars to mean anything.
    const timetable: [string, number, string, number, number, string][] = [
      ["Strength Basics", 1, "07:00", 60, 12, "Barbell work, coached. Good place to start."],
      ["Spin", 2, "18:30", 45, 14, "45 minutes on the bikes, intervals throughout. Bring water."],
      [
        "Mobility & Core",
        3,
        "07:30",
        45,
        16,
        "Hips, shoulders and everything that seizes up at a desk.",
      ],
      ["HIIT", 4, "19:00", 40, 18, "Short, hard, done. Scaled for whoever turns up."],
      ["Yoga", 6, "08:30", 60, 20, "Slow flow, all levels. Mats provided."],
    ];
    const madeClasses: { id: string; capacity: number; dayOfWeek: number }[] = [];
    for (const [name, dayOfWeek, startTime, durationMinutes, capacity, description] of timetable) {
      madeClasses.push(
        await db.gymClass.create({
          data: {
            gymId: gym.id,
            coachId,
            name,
            description,
            dayOfWeek,
            startTime,
            durationMinutes,
            capacity,
          },
          select: { id: true, capacity: true, dayOfWeek: true },
        }),
      );
    }

    for (const c of madeClasses) {
      const date = nextWeekday(c.dayOfWeek);
      // Between a third and nearly full, so both an open class and a busy one
      // are on screen without anybody editing the seed.
      const take = Math.max(1, Math.floor(c.capacity * (0.35 + rand() * 0.5)));
      for (const memberId of memberIds.slice(0, Math.min(take, memberIds.length))) {
        await db.classBooking.create({
          data: { classId: c.id, memberId, date, status: "BOOKED" },
        });
      }
    }

    // Enquiries, at every stage of the pipeline — including two overdue calls,
    // because a follow-up list with nothing overdue teaches an owner nothing.
    // Names come from a shared pool so no two gyms hold the same enquiry, which
    // is what tenant-isolation checks probe for.
    const stages: [string, string, string, number | null, string | null][] = [
      ["WALK_IN", "NEW", "Weight loss, evenings", 0, null],
      ["INSTAGRAM", "CONTACTED", "Personal training", -3, "Asked for prices, sending them over."],
      ["MAP", "TRIAL_BOOKED", "Strength training", 2, "Coming Saturday morning for a look."],
      ["REFERRAL", "JOINED", "Group classes", null, "Joined on the 3-month plan."],
      ["CALL", "LOST", "Monthly membership", null, "Went with the gym next to his office."],
      ["WHATSAPP", "CONTACTED", "Yoga twice a week", -1, "Rang once, no answer."],
    ];
    const people = LEAD_POOL.slice(leadCursor, leadCursor + stages.length);
    leadCursor += stages.length;

    for (const [i, [source, status, interest, dueIn, note]] of stages.entries()) {
      const [name, phone] = people[i] ?? [`Enquiry ${i + 1}`, "+91 90000 00000"];
      const lead = await db.lead.create({
        data: {
          gymId: gym.id,
          name,
          phone,
          source: source as LeadSource,
          status: status as LeadStatus,
          interest,
          nextFollowUpAt: dueIn === null ? null : dayOnly(dueIn),
          joinedAt: status === "JOINED" ? daysFromToday(-4) : null,
          lostReason: status === "LOST" ? "Closer to work" : null,
          createdAt: daysFromToday(-Math.floor(rand() * 20) - 1),
        },
      });
      if (note) {
        await db.leadActivity.create({
          data: { leadId: lead.id, note, createdAt: daysFromToday(-Math.floor(rand() * 5) - 1) },
        });
      }
    }

    console.log(
      `  ${memberIds.length} members, ${madeClasses.length} classes, ${stages.length} enquiries`,
    );
  }

  // Prospects who registered but have not bought — the list an admin works.
  const PROSPECTS: [string, string, string, number, PlanKey | null][] = [
    ["Harpreet Singh", "harpreet@fitforgeludhiana.in", "+91 98140 22110", -2, "MONTHLY"],
    ["Ayesha Khan", "ayesha@corefactory.co.in", "+91 99870 44321", -5, null],
    ["Vivek Rathore", "vivek@ironhouse.fit", "+91 97020 55190", -9, "LIFETIME"],
    ["Deepa Nair", "deepa@studio9pilates.in", "+91 98450 66702", -16, null],
  ];

  for (const [name, email, phone, offset, startedCycle] of PROSPECTS) {
    const user = await db.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role: "PROSPECT",
        createdAt: daysFromToday(offset),
        lastLoginAt: daysFromToday(offset),
      },
    });
    // Some got as far as checkout and stopped — a pending order records that.
    if (startedCycle) {
      await db.platformOrder.create({
        data: {
          userId: user.id,
          tier: "PRO",
          billingCycle: startedCycle,
          amount: orderValue(startedCycle),
          currency: "USD",
          status: "PENDING",
          provider: "manual",
          gymName: name.split(" ")[0] + "'s Gym",
          createdAt: daysFromToday(offset),
        },
      });
    }
  }

  const counts = {
    gyms: await db.gym.count(),
    prospects: await db.user.count({ where: { role: "PROSPECT" } }),
    orders: await db.platformOrder.count(),
    users: await db.user.count(),
    plans: await db.plan.count(),
    subscriptions: await db.subscription.count(),
    payments: await db.payment.count(),
    classes: await db.gymClass.count(),
    bookings: await db.classBooking.count(),
    leads: await db.lead.count(),
    attendance: await db.attendance.count(),
    notes: await db.trainerNote.count(),
  };
  console.log("\nSeed complete:", counts);
  console.log(`
  Platform admin  admin@beongym.in                 / ${DEMO_PASSWORD}
  Gym owner       rohit@irontemple.fit           / ${DEMO_PASSWORD}
  Gym staff       alex@irontemple.fit            / ${DEMO_PASSWORD}
  Lapsed owner    sanjay@grindhouse.in           / ${DEMO_PASSWORD}   (window ran out)
  Member          IRON-4821 / M-0001             / ${DEMO_PASSWORD}   (the member app)
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
