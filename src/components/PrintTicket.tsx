import React from 'react';
import { formatCurrency } from '../lib/utils';
import { Sale, CompanySettings } from '../types';

interface PrintTicketProps {
  sale: Sale | null;
  companySettings: CompanySettings;
}

/* ─── Shared styles ─── */
const base: React.CSSProperties = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '10pt',
  fontWeight: 600,
  color: '#000',
  lineHeight: 1.4,
  margin: 0,
  padding: 0,
  boxSizing: 'border-box',
};
const bold: React.CSSProperties = { fontWeight: 900 };

/* Price column is always 18mm wide, description takes the rest */
const PriceRow = ({
  label,
  price,
  labelStyle,
  priceStyle,
}: {
  label: React.ReactNode;
  price: string;
  labelStyle?: React.CSSProperties;
  priceStyle?: React.CSSProperties;
}) => (
  <div style={{ display: 'flex', width: '100%', alignItems: 'baseline' }}>
    <div style={{ flex: 1, overflow: 'hidden', ...labelStyle }}>{label}</div>
    <div style={{ width: '18mm', textAlign: 'right', flexShrink: 0, ...priceStyle }}>
      {price}
    </div>
  </div>
);

const Divider = () => (
  <div style={{ borderTop: '1.5px solid #000', margin: '2mm 0' }} />
);

export const PrintTicket: React.FC<PrintTicketProps> = ({ sale, companySettings }) => {
  if (!sale) return null;

  const paymentLabel =
    sale.paymentMethod === 'cash' ? 'EFECTIVO' :
    sale.paymentMethod === 'card' ? 'TARJETA' :
    'TRANSFERENCIA';

  const totalDiscount = (sale.items || []).reduce((acc: number, item: any) => {
    const listPrice = item?.price || 0;
    const salePrice = item?.offerPrice || item?.price || 0;
    return acc + Math.round((listPrice - salePrice) * (item?.quantity || 0));
  }, 0);

  return (
    <div
      style={{
        ...base,
        width: '68mm',
        margin: '0 auto',
        padding: '3mm 2mm',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        <div style={{ ...bold, fontSize: '15pt', letterSpacing: '1px' }}>
          {(companySettings.name || 'Empresa').toUpperCase()}
        </div>
        {companySettings.slogan && (
          <div style={bold}>{companySettings.slogan}</div>
        )}
        {companySettings.address && (
          <div style={{ marginTop: '0.5mm', ...bold }}>{companySettings.address}</div>
        )}
        {companySettings.phone && (
          <div style={bold}>Tel: {companySettings.phone}</div>
        )}
      </div>

      <Divider />

      {/* ── SALE INFO ── */}
      <div style={{ marginBottom: '2mm' }}>
        <div><span style={bold}>FECHA:</span> <span style={bold}>{new Date(sale.date).toLocaleString('es-CL')}</span></div>
        <div><span style={bold}>N° TICKET:</span> <span style={bold}>{(sale.id ? sale.id.slice(0, 8) : 'N/A').toUpperCase()}</span></div>
        <div><span style={bold}>CAJERO:</span> <span style={bold}>{(sale.cashierName || (sale.cashierId ? sale.cashierId.slice(0, 8) : 'N/A')).toUpperCase()}</span></div>
        <div><span style={bold}>PAGO:</span> <span style={bold}>{paymentLabel}</span></div>
      </div>

      <Divider />

      {/* ── COLUMN HEADERS ── */}
      <PriceRow
        label={<span style={bold}>DESCRIPCION</span>}
        price="TOTAL"
        priceStyle={bold}
      />
      <Divider />

      {/* ── ITEMS ── */}
      {(sale.items || []).map((item: any, i: number) => {
        const unitPrice = item?.price || 0;
        const finalPrice = item?.offerPrice || item?.price || 0;
        const discount = unitPrice - finalPrice;
        const qtyLabel = item?.saleType === 'weight'
          ? `${(item?.quantity || 0).toFixed(3)} kg`
          : `${item?.quantity || 0}`;
        const lineTotal = Math.round(finalPrice * (item?.quantity || 0));
        const lineDiscount = Math.round(discount * (item?.quantity || 0));

        return (
          <div key={`${item?.id || i}-${i}`} style={{ marginBottom: '2.5mm' }}>
            {/* Name */}
            <div style={{ ...bold, wordBreak: 'break-word', fontSize: '11pt' }}>
              {(item?.name || 'PRODUCTO').toUpperCase()}
            </div>

            {/* Kitchen note */}
            {item?.notes && (
              <div style={{ fontSize: '9.5pt', fontStyle: 'italic', paddingLeft: '2mm', ...bold }}>
                * {item.notes}
              </div>
            )}

            {/* Qty × price → line total */}
            <PriceRow
              label={<span style={bold}>  {qtyLabel} x {formatCurrency(finalPrice)}</span>}
              price={formatCurrency(lineTotal)}
              priceStyle={bold}
            />

            {/* Discount note if applicable */}
            {lineDiscount > 0 && (
              <div style={{ fontSize: '9pt', fontStyle: 'italic', paddingLeft: '4mm', ...bold, color: '#333' }}>
                (Dcto: -{formatCurrency(lineDiscount)})
              </div>
            )}
          </div>
        );
      })}

      <Divider />

      {/* ── SUBTOTAL / DISCOUNTS (only when discounts exist) ── */}
      {totalDiscount > 0 && (
        <>
          <PriceRow
            label="Subtotal:"
            price={formatCurrency(Math.round((sale.total || 0) + totalDiscount))}
          />
          <PriceRow
            label="Descuentos:"
            price={`-${formatCurrency(totalDiscount)}`}
          />
        </>
      )}

      {/* ── TOTAL ── */}
      <PriceRow
        label={<span style={{ ...bold, fontSize: '13pt' }}>TOTAL:</span>}
        price={formatCurrency(Math.round(sale.total || 0))}
        labelStyle={{ fontSize: '13pt' }}
        priceStyle={{ ...bold, fontSize: '13pt' }}
      />

      <Divider />

      {/* ── FOOTER ── */}
      <div style={{ textAlign: 'center', marginTop: '3mm', ...bold }}>
        <div>¡GRACIAS POR SU COMPRA!</div>
        <div style={{ marginTop: '1mm' }}>VUELVA PRONTO</div>
      </div>

      {/* Paper feed spacer */}
      <div style={{ height: '15mm' }} />
    </div>
  );
};
