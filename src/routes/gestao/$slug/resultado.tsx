import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "#/components/ui/empty-state";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { useListEventResults } from "#/lib/api/gen/hooks/useListEventResults";
import { dateTime, money, weekday } from "#/lib/format";

export const Route = createFileRoute("/gestao/$slug/resultado")({
  component: EventResultsAdmin,
});

/**
 * Quanto cada evento deu. Existia espalhado entre a lista de presença (quem veio) e o
 * extrato (quanto entrou), e ninguém conseguia responder "valeu a pena fazer o mutirão?"
 * sem somar à mão.
 *
 * As duas contas aparecem separadas de propósito: vaga garantida conta quem reservou e
 * ainda não pagou (é quem aparece na porta), dinheiro conta só o que entrou. Juntar as duas
 * prometeria receita que ainda pode expirar.
 */
function EventResultsAdmin() {
  const { slug } = Route.useParams();
  const [upcoming, setUpcoming] = useState(false);
  const { data, isPending } = useListEventResults(slug, {
    limit: 50,
    upcoming: upcoming ? "true" : "false",
  });
  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-lg tracking-tight">Resultado</h2>
          <p className="mt-1 max-w-[60ch] text-muted text-sm">
            O que cada evento deu: quantas vagas saíram, quem chegou e quanto ficou com a loja.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-(--brand)"
            checked={upcoming}
            onChange={(item) => setUpcoming(item.target.checked)}
          />
          Incluir os que ainda vão acontecer
        </label>
      </div>

      {isPending ? (
        <SkeletonRows rows={3} className="mt-6" />
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<CalendarCheck className="h-6 w-6" aria-hidden />}
          title="Nenhum evento aconteceu ainda."
        >
          Depois do primeiro, o resultado dele aparece aqui — vagas vendidas, quem chegou e o
          dinheiro que ficou.
        </EmptyState>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((item) => (
            <li key={item.slug} className="card p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-display font-semibold">{item.name}</p>
                {!item.finished && <Tag tone="brand">ainda vai acontecer</Tag>}
                {item.finished && item.seatsLeft === 0 && <Tag>lotou</Tag>}
                <p className="text-muted text-sm">
                  {weekday(item.at)}, <span className="tabular-nums">{dateTime(item.at)}</span>
                </p>
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Line
                  label="Vagas garantidas"
                  value={`${item.soldQty}`}
                  detail={
                    // pendente é vaga reservada que pode expirar: aparece, mas separada
                    item.soldQty > item.paidQty
                      ? `${item.paidQty} pagas, ${item.soldQty - item.paidQty} aguardando pagamento`
                      : item.seatsLeft > 0
                        ? `${item.seatsLeft} ainda livres`
                        : "esgotou as vagas"
                  }
                />
                <Line
                  label="Chegaram"
                  value={`${item.checkedInQty} de ${item.soldQty}`}
                  detail={
                    item.finished && item.soldQty > 0 && item.checkedInQty === 0
                      ? "ninguém foi marcado na porta"
                      : undefined
                  }
                />
                <Line label="Receita" value={money(item.grossCents)} detail="só de vaga paga" />
                <Line
                  label="Fica com a loja"
                  value={money(item.netCents)}
                  strong
                  detail={
                    item.payoutCents > 0
                      ? `depois de ${money(item.payoutCents)} de repasse`
                      : undefined
                  }
                />
              </dl>

              {/* O centavo retido no Pix aparece porque o líquido acima já o desconta: sem
                  esta linha a conta não fecha na mão de quem confere. */}
              {item.feeCents > 0 && (
                <p className="mt-3 text-muted text-xs">
                  {money(item.feeCents)} ficaram retidos no pagamento e não chegam na conta da loja
                  — no Pix é o mínimo que o provedor não deixa repassar.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Line({
  label,
  value,
  detail,
  strong,
}: {
  label: string;
  value: string;
  detail?: string | undefined;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:justify-start sm:gap-2">
      <dt className="text-muted text-sm">{label}</dt>
      <dd className="text-right sm:ml-auto sm:text-left">
        <span className={`tabular-nums ${strong ? "font-semibold text-ink" : "font-medium"}`}>
          {value}
        </span>
        {detail && <span className="block text-muted text-xs">{detail}</span>}
      </dd>
    </div>
  );
}
