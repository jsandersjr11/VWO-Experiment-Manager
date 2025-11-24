import { useEffect, useState } from 'react';
import { VWOService } from '../services/vwoService';

interface Experiment {
  id: string;
  name: string;
  status: string;
  // Add other experiment properties as needed
}

export function ExperimentManager() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExperiments() {
      try {
        const activeExperiments = await VWOService.getActiveExperiments();
        setExperiments(activeExperiments);
      } catch (err) {
        setError('Failed to load experiments');
      } finally {
        setLoading(false);
      }
    }

    loadExperiments();
  }, []);

  if (loading) return <div>Loading experiments...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Active Experiments</h2>
      <ul>
        {experiments.map(experiment => (
          <li key={experiment.id}>
            {experiment.name} - {experiment.status}
          </li>
        ))}
      </ul>
    </div>
  );
} 