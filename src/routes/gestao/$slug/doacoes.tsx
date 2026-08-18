import { createFileRoute } from "@tanstack/react-router";
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
  const totalCents = donations
    .filter((donation) => donation.status === "paid")
    .reduce((sum, donation) => sum + donation.amountCents, 0);

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Doações</h2>
        {donations.length > 0 && (
          <p className="text-sm text-muted tabular-nums">
            {money(totalCents)} recebidos nas últimas {donations.length}
          </p>
        )}
      </div>

      {isPending ? (
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-surface" />
      ) : donations.length === 0 ? (
        <p className="card mt-6 px-6 py-12 text-center text-muted">
          Nenhuma doação ainda. Crie uma campanha e compartilhe — o botão de doar já está na página
          da loja.
        </p>
      ) : (
        <ul className="mt-6 grid gap-2.5">
          {donations.map((donation) => (
            <li
              key={donation.id}
              className="card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">
                    {donation.anonymous ? "Doação anônima" : (donation.donor?.name ?? "Doação")}
                  </span>
                  {donation.type === "monthly" && (
                    <Tag tone={donation.subscriptionActive ? "brand" : "neutral"}>
                      mensal{donation.subscriptionActive ? "" : " (cancelada)"}
                    </Tag>
                  )}
                  {donation.campaign && <Tag>{donation.campaign.title}</Tag>}
                </p>
                {donation.message && (
                  <p className="mt-1 text-sm text-muted">“{donation.message}”</p>
                )}
                <p className="mt-1 text-xs text-muted">{longDate(donation.createdAt)}</p>
              </div>
              <p className="font-display font-semibold tabular-nums">
                {money(donation.amountCents)}
                {donation.type === "monthly" && <span className="text-sm text-muted">/mês</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
