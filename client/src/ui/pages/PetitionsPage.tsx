import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { PetitionCard, type Petition } from "../components.js";

export const PetitionsPage = () => {
  const [petitions, setPetitions] = useState<Petition[]>([]);

  useEffect(() => {
    api<{ petitions: Petition[] }>("/api/public/petitions").then((data) => setPetitions(data.petitions));
  }, []);

  return (
    <section className="page-section">
      <div className="page-title">
        <span>Petitions</span>
        <h1>Petitions</h1>
        <p>The current petition comes first. Older petitions stay listed to show how long fans have been asking.</p>
      </div>
      <div className="card-grid two">
        {petitions.map((petition) => (
          <div key={petition._id}>
            <PetitionCard petition={petition} />
            <p className="sync-note">
              <RefreshCw size={14} />
              {petition.lastSyncedAt ? `Last checked ${new Date(petition.lastSyncedAt).toLocaleString()}` : "Awaiting first sync"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
