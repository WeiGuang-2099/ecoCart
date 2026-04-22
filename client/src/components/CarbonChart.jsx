import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CarbonChart({ production, transport, packaging }) {
  const data = {
    labels: ['Production', 'Transport', 'Packaging'],
    datasets: [{
      data: [production || 0, transport || 0, packaging || 0],
      backgroundColor: ['#27ae60', '#3498db', '#e67e22'],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 16, usePointStyle: true }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.parsed.toFixed(3)} kg CO2e`
        }
      }
    }
  };

  const total = (production || 0) + (transport || 0) + (packaging || 0);
  if (total === 0) return <p className="text-muted">No emission data available</p>;

  return <Doughnut data={data} options={options} />;
}
