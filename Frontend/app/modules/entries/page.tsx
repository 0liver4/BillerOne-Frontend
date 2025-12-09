"use client";

import { useState, useEffect, FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

type Factura = {
  FacturaID: number;
  Cliente: string;
  Fecha: string;
  Total: number;
};

type AsientoHistorial = {
  id: number;
  facturaid: number | null;
  amount: number;
  period: string;
  description: string | null;
  iso_debit_entry_id: number | null;
  iso_credit_entry_id: number | null;
  status: "OK" | "ERROR" | string;
  error_message: string | null;
  created_at: string;
};

export default function AccountingEntriesPage() {
  // Formulario
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<any>(null);

  // Facturas
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [selectedFacturaId, setSelectedFacturaId] = useState<number | null>(
    null
  );
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  // Historial
  const [historial, setHistorial] = useState<AsientoHistorial[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // =========================
  // Cargar facturas
  // =========================
  const loadFacturas = async () => {
    try {
      setLoadingFacturas(true);
      const resp = await fetch(`${API_BASE_URL}/api/facturas`);
      if (!resp.ok) throw new Error("Error al cargar facturas");
      const data = (await resp.json()) as Factura[];
      setFacturas(data);
    } catch (err) {
      console.error(err);
      setError("Error al cargar las facturas");
    } finally {
      setLoadingFacturas(false);
    }
  };

  // =========================
  // Cargar historial
  // =========================
  const loadHistorial = async () => {
    try {
      setLoadingHistorial(true);
      const resp = await fetch(`${API_BASE_URL}/api/asientos/historial`);
      if (!resp.ok) throw new Error("Error al cargar historial de asientos");
      const data = (await resp.json()) as AsientoHistorial[];
      setHistorial(data);
    } catch (err) {
      console.error(err);
      setError("Error al cargar el historial de asientos");
    } finally {
      setLoadingHistorial(false);
    }
  };

  useEffect(() => {
    loadFacturas();
    loadHistorial();
  }, []);

  // Cuando el usuario selecciona una factura
  const handleSelectFactura = (factura: Factura) => {
    setSelectedFacturaId(factura.FacturaID);

    // Monto = total de la factura
    setAmount(String(factura.Total));

    // Periodo = YYYY-MM basado en la fecha de la factura
    const d = new Date(factura.Fecha);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    setPeriod(`${yyyy}-${mm}`);

    // Descripción sugerida
    setDescription(
      `Asiento de Facturacion correspondiente al periodo ${yyyy}-${mm} - Factura #${factura.FacturaID}`
    );
  };

  // =========================
  // Enviar asiento
  // =========================
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResponseData(null);

    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount)) {
      setError("El monto debe ser un número válido.");
      return;
    }

    try {
      setLoading(true);

      const resp = await fetch(
        `${API_BASE_URL}/api/asientos/facturacion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numericAmount,
            period: period || undefined, // YYYY-MM
            description: description || undefined,
            invoiceId: selectedFacturaId || undefined,
          }),
        }
      );

      const data = await resp.json();

      if (!resp.ok || !data.isOk) {
        throw new Error(data.message || "Error al enviar el asiento.");
      }

      setResponseData(data);
      await loadHistorial(); // refresca la tabla
    } catch (err: any) {
      setError(err.message || "Error inesperado al enviar el asiento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Título y subtítulo */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Asientos contables
        </h1>
        <p className="text-muted-foreground mt-1">
          Envía asientos de facturación al módulo Contabilidad y revisa el
          historial de envíos.
        </p>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* IZQUIERDA: selector de factura + formulario */}
        <Card className="xl:col-span-2 p-4 lg:p-6 space-y-6">
          {/* Selector de factura */}
          <div className="space-y-2">
            <Label>Seleccionar factura</Label>
            <div className="flex gap-2 items-center">
              <select
                className="border rounded-md px-3 py-2 w-full"
                value={selectedFacturaId ?? ""}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  const f = facturas.find(
                    (x) => x.FacturaID === id
                  );
                  if (f) handleSelectFactura(f);
                  else setSelectedFacturaId(null);
                }}
              >
                <option value="">
                  {loadingFacturas
                    ? "Cargando facturas..."
                    : "Seleccione una factura…"}
                </option>
                {facturas.map((f) => (
                  <option key={f.FacturaID} value={f.FacturaID}>
                    #{f.FacturaID} — {f.Cliente} — $
                    {f.Total.toLocaleString()}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={loadFacturas}
                disabled={loadingFacturas}
              >
                {loadingFacturas ? "..." : "Actualizar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Al seleccionar una factura, el monto y el periodo se llenan
              automáticamente.
            </p>
          </div>

          {/* Formulario de asiento */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold">
              Nuevo asiento de facturación
            </h2>

            <div className="space-y-1">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej: 120000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="period">Periodo (YYYY-MM)</Label>
              <Input
                id="period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Si lo dejas vacío, se usará el periodo actual.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                rows={2}
                placeholder="Asiento de Facturacion correspondiente al periodo YYYY-MM"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar asiento"}
            </Button>

            {error && (
              <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <strong>Error:</strong> {error}
              </div>
            )}

            {responseData && (
              <div className="mt-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm">
                <p className="font-medium">
                  Asiento enviado correctamente al módulo Contabilidad.
                </p>
                <pre className="mt-2 max-h-64 overflow-auto rounded bg-background/60 p-2 text-xs">
{JSON.stringify(responseData.data, null, 2)}
                </pre>
              </div>
            )}
          </form>
        </Card>

        {/* DERECHA: ayuda */}
        <Card className="hidden xl:flex flex-col justify-between p-4 lg:p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">
              Cómo se genera el asiento
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Cada envío crea automáticamente un asiento contable de
              facturación en el módulo Contabilidad:
            </p>
            <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>
                Un movimiento <strong>DB</strong> a la cuenta de ingresos.
              </li>
              <li>
                Un movimiento <strong>CR</strong> a la cuenta de inventario.
              </li>
              <li>Mismo monto, periodo y descripción para ambos.</li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-3">
            <p>
              Las cuentas, tipo de movimiento y auxiliar se configuran desde el
              backend mediante variables de entorno (
              <code>FACT_ACCOUNT_ID_DEBIT</code>,{" "}
              <code>FACT_ACCOUNT_ID_CREDIT</code>,{" "}
              <code>AUXILIARY_ID</code>).
            </p>
          </div>
        </Card>
      </div>

      {/* HISTORIAL DE ASIENTOS */}
      <Card className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Historial de asientos</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistorial}
            disabled={loadingHistorial}
          >
            {loadingHistorial ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">Factura</th>
                <th className="text-right py-2 px-2">Monto</th>
                <th className="text-left py-2 px-2">Periodo</th>
                <th className="text-left py-2 px-2">Estado</th>
                <th className="text-left py-2 px-2">DB/CR</th>
                <th className="text-left py-2 px-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-border hover:bg-muted/30"
                >
                  <td className="py-2 px-2">{h.id}</td>
                  <td className="py-2 px-2">
                    {h.facturaid ? `#${h.facturaid}` : "-"}
                  </td>
                  <td className="py-2 px-2 text-right">
                    ${Number(h.amount).toLocaleString()}
                  </td>
                  <td className="py-2 px-2">{h.period}</td>
                  <td className="py-2 px-2">
                    <span
                      className={
                        h.status === "OK"
                          ? "text-emerald-600 font-medium"
                          : "text-red-600 font-medium"
                      }
                    >
                      {h.status}
                    </span>
                    {h.error_message && (
                      <span className="block text-xs text-muted-foreground">
                        {h.error_message}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    DB: {h.iso_debit_entry_id ?? "-"} / CR:{" "}
                    {h.iso_credit_entry_id ?? "-"}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {new Date(h.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}

              {historial.length === 0 && !loadingHistorial && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No hay asientos registrados aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
