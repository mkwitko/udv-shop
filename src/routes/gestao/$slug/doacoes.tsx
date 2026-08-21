import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { GlyphCoracao } from "#/components/ui/glyphs";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { useListStoreDonations } from "#/lib/api/gen/hooks/useListStoreDonations";
import { longDate, money } from "#/lib/format";

export const Route = createFileRoute("/gestao/$slug/doacoes")({
  component: DonationsAdmin,
});

function DonationsAdmin() {
  const { slug } = Route.useParams();
  const { data, isPending } = useListStoreDonations(slug, { limit: 50 });
  const donations = data?.items ?? [];
  const paid = donations.filter((donation) => donation.status === "paid");
  const totalCents = paid.reduce((sum, donation) => sum + donation.amountCents, 0);
  const monthlyActive = donations.filter(
    (donation) => donation.type === "monthly" && donation.subscriptionActive,
  ).length;

  return (
    <div>
      <h2 className="font-display text-lg font-semibold tracking-tight">Doações</h2>
      <p className="mt-1 text-sm text-muted">
        Cada apoio que chegou pela sua loja ou por uma campanha, com a mensagem de quem doou.
      </p>

      {isPending ? (
        <SkeletonRows rows={3} className="mt-6" />
      ) : donations.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Ainda não há doações."
          action={
            <Button asChild variant="secondary">
              <Link to="/gestao/$slug/campanhas" params={{ slug }}>
                Criar campanha
              </Link>
            </Button>
          }
        >
          Quando alguém apoiar sua loja, o apoio aparece aqui. Uma campanha com meta auxilia a
          comunidade a entender para onde vai o dinheiro.
        </EmptyState>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatCard label="Recebido" value={money(totalCents)} />
            <StatCard
              label="Doações confirmadas"
              value={String(paid.length)}
              hint={
                donations.length > paid.length
                  ? `${donations.length - paid.length} aguardando pagamento`
                  : undefined
              }
            />
            <StatCard label="Mensais ativas" value={String(monthlyActive)} />
          </div>

          <ul className="mt-4 grid gap-2.5">
            {donations.map((donation) => {
              const name = donation.anonymous
                ? "Pessoa anônima"
                : (donation.donor?.name ?? "Pessoa apoiadora");
              return (
                <li key={donation.id} className="card flex flex-wrap items-center gap-4 p-4">
                  <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-full bg-plum/15 font-bold font-display text-plum">
                    {donation.anonymous ? (
                      <GlyphCoracao className="h-5 w-5" />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{name}</span>
                      {donation.type === "monthly" && (
                        <Tag tone={donation.subscriptionActive ? "brand" : "neutral"}>
                          mensal{donation.subscriptionActive ? "" : " (cancelada)"}
                        </Tag>
                      )}
                      {donation.status === "pending_payment" && (
                        <Tag tone="accent">aguardando pagamento</Tag>
                      )}
                      {donation.status === "failed" && <Tag tone="neutral">não concluída</Tag>}
                      {donation.campaign && <Tag>{donation.campaign.title}</Tag>}
                    </p>
                    {donation.message && (
                      <p className="mt-1 text-sm text-muted">“{donation.message}”</p>
                    )}
                    <p className="mt-1 text-xs text-muted">{longDate(donation.createdAt)}</p>
                  </div>
                  <p className="font-display font-semibold tabular-nums">
                    {money(donation.amountCents)}
                    {donation.type === "monthly" && (
                      <span className="text-sm text-muted">/mês</span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-muted text-sm">{label}</p>
      <p className="mt-1 font-bold font-display text-2xl tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-muted text-xs">{hint}</p>}
    </div>
  );
}
