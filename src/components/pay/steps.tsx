/** "Passo 1 de 2" — quem não é do mundo digital precisa saber onde está e quanto falta. */
export function StepHeading({
  step,
  total,
  title,
}: {
  step: number;
  total: number;
  title: string;
}) {
  return (
    <div>
      <p className="kicker">
        Passo {step} de {total}
      </p>
      <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">{title}</h1>
    </div>
  );
}
