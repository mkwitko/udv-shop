import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { FormError } from "#/components/ui/field";
import { SkeletonRows } from "#/components/ui/skeleton";
import { useToast } from "#/components/ui/toast";
import { downloadFile } from "#/lib/api/download";
import { errorMessage } from "#/lib/api/error-message";
import { useGetStatement } from "#/lib/api/gen/hooks/useGetStatement";
import type { GetStatement200 } from "#/lib/api/gen/types/GetStatement";
import { money } from "#/lib/format";

export const Route = createFileRoute("/gestao/$slug/extrato")({
  component: StatementAdmin,
});

type Month = GetStatement200["months"][number];

/** "2026-08" → "agosto de 2026" */
function monthLabel(month: string): string {
  const [year, index] = month.split("-");
  const date = new Date(Number(year), Number(index) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function StatementAdmin() {
  const { slug } = Route.useParams();
  const { data, isPending, isError } = useGetStatement(slug, { months: 6 });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function download(kind: "pedidos" | "encomendas") {
    setBusy(kind);
    setError(null);
    try {
      const path = kind === "pedidos" ? "orders.csv" : "interests.csv";
      await downloadFile(`/stores/${slug}/${path}`, `${kind}-${slug}.csv`);
      toast(`Arquivo de ${kind} baixado.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h2 className="font-display font-semibold text-lg tracking-tight">Extrato</h2>
      <p className="mt-1 text-muted text-sm">
        O que entrou pela loja, mês a mês: vendas, doações, taxa da plataforma e repasse a
        parceiros. Valores de pedidos reembolsados saem da conta.
      </p>

      <FormError>{error}</FormError>

      {isPending ? (
        <SkeletonRows rows={3} className="mt-6" />
      ) : isError || !data ? (
        <p className="mt-6 text-danger text-sm" role="alert">
          Não conseguimos carregar o extrato agora. Recarregue a página.
        </p>
      ) : data.months.length === 0 ? (
        <EmptyState className="mt-6" title="Nada entrou ainda.">
          Quando a primeira venda ou doação for paga, ela aparece aqui com a conta fechada do mês.
        </EmptyState>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Figure label="Vendas" value={money(data.totals.salesGrossCents)}>
              {data.totals.salesCount === 1
                ? "1 pedido pago"
                : `${data.totals.salesCount} pedidos pagos`}
            </Figure>
            <Figure label="Doações" value={money(data.totals.donationsGrossCents)}>
              {data.totals.donationsCount === 1
                ? "1 doação"
                : `${data.totals.donationsCount} doações`}
            </Figure>
            <Figure
              label="Taxa e repasses"
              value={money(data.totals.feeCents + data.totals.payoutCents)}
            >
              {money(data.totals.feeCents)} de taxa · {money(data.totals.payoutCents)} de repasse
            </Figure>
            <Figure label="Ficou com a loja" value={money(data.totals.netCents)}>
              somando os meses abaixo
            </Figure>
          </div>

          {data.payoutsOpenCents > 0 && (
            <p className="mt-4 text-muted text-sm">
              Ainda há {money(data.payoutsOpenCents)} de repasse em aberto.{" "}
              <Link
                to="/gestao/$slug/repasses"
                params={{ slug }}
                className="text-brand-deep underline underline-offset-4"
              >
                Ver repasses
              </Link>
            </p>
          )}

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm tabular-nums">
              <thead>
                <tr className="border-line border-b text-left text-muted">
                  <th className="py-2 pr-4 font-medium">Mês</th>
                  <th className="py-2 pr-4 text-right font-medium">Vendas</th>
                  <th className="py-2 pr-4 text-right font-medium">Doações</th>
                  <th className="py-2 pr-4 text-right font-medium">Taxa</th>
                  <th className="py-2 pr-4 text-right font-medium">Repasse</th>
                  <th className="py-2 text-right font-medium">Ficou com a loja</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((month: Month) => (
                  <tr key={month.month} className="border-line/70 border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{monthLabel(month.month)}</td>
                    <td className="py-2.5 pr-4 text-right">{money(month.salesGrossCents)}</td>
                    <td className="py-2.5 pr-4 text-right">{money(month.donationsGrossCents)}</td>
                    <td className="py-2.5 pr-4 text-right text-muted">−{money(month.feeCents)}</td>
                    <td className="py-2.5 pr-4 text-right text-muted">
                      −{money(month.payoutCents)}
                    </td>
                    <td className="py-2.5 text-right font-semibold">{money(month.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <section className="mt-10">
        <h3 className="kicker">Levar para a planilha</h3>
        <p className="mt-2 max-w-[52ch] text-muted text-sm">
          Baixa um arquivo que abre no Excel, no Google Planilhas ou no LibreOffice. Na lista de
          encomendas o telefone sai mascarado, igual à tela.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy !== null}
            onClick={() => download("pedidos")}
          >
            <Download className="h-4 w-4" aria-hidden />
            {busy === "pedidos" ? "Gerando…" : "Baixar pedidos"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy !== null}
            onClick={() => download("encomendas")}
          >
            <Download className="h-4 w-4" aria-hidden />
            {busy === "encomendas" ? "Gerando…" : "Baixar encomendas"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function Figure({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <p className="kicker">{label}</p>
      <p className="mt-1 font-display font-semibold text-xl tabular-nums">{value}</p>
      <p className="mt-0.5 text-muted text-sm">{children}</p>
    </div>
  );
}
