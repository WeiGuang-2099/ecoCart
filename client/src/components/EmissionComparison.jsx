import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function EmissionComparison({ currentEmissions, alternatives }) {
  if (!alternatives || alternatives.length === 0) return null;

  const labels = ['Current Product', ...alternatives.map(a => a.name)];
  const values = [currentEmissions, ...alternatives.map(a => Math.max(0, currentEmissions - a.carbonReduction))];
  const colors = ['#e74c3c', '#27ae60', '#2ecc71', '#1abc9c', '#16a085'];

  const data = {
    labels,
    datasets: [{
      label: 'CO2e (kg)',
      data: values,
      backgroundColor: colors.slice(0, values.length),
      borderRadius: 6
    }]
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.x.toFixed(3)} kg CO2e`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: 'kg CO2e' }
      }
    }
  };

  return (
    <div style={{ height: `${Math.max(200, values.length * 50)}px` }}>
      <Bar data={data} options={options} />
    </div>
  );
}
