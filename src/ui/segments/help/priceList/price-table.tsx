import type { SinglePrice } from '@/app/api/help/prices/route';

interface PriceTableProps {
  prices: SinglePrice[];
}

export default function PriceTable({ prices }: PriceTableProps) {
  return (
    <div>
      <h2>Price Table</h2>
      {prices.length === 0 ? (
        <p>No prices available</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Free Price</th>
              <th>Pro Price</th>
              <th>Cost Unit</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((price) => {
              const uniqueKey = `${price.itemName ?? ''}-${price.freePrice ?? ''}-${price.proPrice ?? ''}-${price.costUnit ?? ''}`;
              return (
                <tr key={uniqueKey}>
                  <td>{price.itemName ?? '-'}</td>
                  <td>{price.freePrice ?? '-'}</td>
                  <td>{price.proPrice ?? '-'}</td>
                  <td>{price.costUnit ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
