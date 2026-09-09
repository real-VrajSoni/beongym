import { Dumbbell, Salad, Timer } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getMemberProgramme } from "@/lib/data/member";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { DAY_LABELS } from "@/lib/labels";

export const metadata = { title: "Training" };

export default async function MemberTrainingPage() {
  const session = await requireMember();
  const programme = await getMemberProgramme(session.profileId);

  if (!programme) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
        <EmptyState
          icon={Dumbbell}
          title="No programme yet"
          description="Once your gym puts you on a plan with a training split, every day of it appears here — sets, reps and your coach's cues."
        />
      </div>
    );
  }

  const { workout, diet } = programme;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">
          {programme.planName}
        </h1>
        {programme.planDescription ? (
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
            {programme.planDescription}
          </p>
        ) : null}
      </div>

      {workout ? (
        <div className="space-y-4">
          <h2 className="text-[15px] font-semibold">{workout.name}</h2>
          {workout.days.map((day) => (
            <Section
              key={day.id}
              title={day.title}
              description={
                [DAY_LABELS[day.dayOfWeek] ?? null, day.focus].filter(Boolean).join(" · ") ||
                undefined
              }
              bodyClassName="px-0 py-0"
            >
              {day.exercises.length === 0 ? (
                <p className="px-5 py-4 text-[13px] text-muted-foreground">
                  Rest day — nothing planned.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {day.exercises.map((ex) => (
                    <li key={ex.id} className="px-5 py-3.5">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="text-[13.5px] font-medium">{ex.name}</p>
                        <p className="tabular shrink-0 text-[13px] text-muted-foreground">
                          {ex.sets} × {ex.reps}
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                        {ex.restSeconds ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Timer className="size-3.5" />
                            {ex.restSeconds}s rest
                          </span>
                        ) : null}
                        {ex.tempo ? <span>Tempo {ex.tempo}</span> : null}
                      </div>
                      {ex.coachCue ? (
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                          {ex.coachCue}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          ))}
        </div>
      ) : null}

      {diet ? (
        <Section
          title={diet.name}
          description={
            diet.caloriesTarget
              ? `${diet.caloriesTarget} kcal · ${diet.proteinTarget ?? "—"}p / ${diet.carbsTarget ?? "—"}c / ${diet.fatsTarget ?? "—"}f`
              : undefined
          }
          bodyClassName="px-0 py-0"
        >
          {diet.description ? (
            <p className="border-b border-[var(--border)] px-5 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
              {diet.description}
            </p>
          ) : null}
          {diet.meals.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-muted-foreground">
              Your coach hasn&rsquo;t written the meals out yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {diet.meals.map((meal) => (
                <li key={meal.id} className="px-5 py-3.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="inline-flex items-center gap-2 text-[13.5px] font-medium">
                      <Salad className="size-3.5 text-[var(--success)]" />
                      {meal.title}
                    </p>
                    {meal.timing ? (
                      <p className="shrink-0 text-[12px] text-muted-foreground">{meal.timing}</p>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {meal.description}
                  </p>
                  {meal.calories || meal.protein ? (
                    <p className="tabular mt-1 text-[12px] text-[var(--subtle-foreground)]">
                      {meal.calories ? `${meal.calories} kcal` : ""}
                      {meal.calories && meal.protein ? " · " : ""}
                      {meal.protein ? `${meal.protein}g protein` : ""}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      {!workout && !diet ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState
            icon={Dumbbell}
            title="Nothing written up yet"
            description="Your plan doesn't have a training split or nutrition attached. Your coach can add both, and they'll appear here."
          />
        </div>
      ) : null}
    </div>
  );
}
