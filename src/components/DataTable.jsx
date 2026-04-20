function statusClass(status) {
  if (status === "Atrasado") return "chip atraso";
  if (status === "Em Andamento") return "chip andamento";
  return "chip pendente";
}

export default function DataTable({ headers, rows, statusColIndex }) {
  return (
    <table className="timeline-table">
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row[0]}-${row[1]}`}>
            {row.map((cell, idx) => (
              <td key={`${row[0]}-${idx}`}>
                {idx === statusColIndex ? (
                  <span className={statusClass(cell)}>{cell}</span>
                ) : (
                  cell
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
