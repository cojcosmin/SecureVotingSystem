# SecureVotingSystem — Sistem Local de Votare Electronic Securizat

Proof of Concept (PoC) dezvoltat pentru Sesiunea de Comunicări Științifice Studențești (Informatică Managerială), care demonstrează asigurarea integrității, confidențialității și auditabilității unui proces de vot electronic fără latența unei rețele blockchain publice.

## Arhitectură

- **`/database`** — PostgreSQL (`SecureVotingDB`), cu separarea strictă între evidența alegătorilor (`voter_records`) și urna anonimă (`vote_chain`).
- **`/backend`** — ASP.NET Core Web API (C#), responsabil pentru anonimizare (`SHA-256 + Salt`), tranzacții ACID, auditare liniară $O(N)$ și simularea atacurilor.
- **`/frontend`** — Aplicație web React + Vite + Tailwind CSS pentru votare, vizualizarea rezultatelor, explorarea lanțului de blocuri și rularea benchmark-urilor.

## Funcționalități Cheie

- **Anonimizare ireversibilă (GDPR):** CNP-ul este transformat prin `SHA-256 + Salt` înainte de salvare; nu există cheie străină între `voter_records` și `vote_chain`.
- **Prevenirea votului multiplu:** Constrângere `PRIMARY KEY` la nivel de PostgreSQL cu `Rollback` tranzacțional automat.
- **Integritate prin Hash Chain:** Fiecare vot este sigilat criptografic folosind `candidate_name` și `previous_hash`.
- **Detecția fraudelor:** Identifică imediat atât modificările neautorizate (`UPDATE` — hash recalculat diferit), cât și ștergerile din lanț (`DELETE` — ruperea legăturii dintre blocuri).

## Performanță (Benchmark Local)

| Volum voturi | Timp inserare ACID | Medie / vot | Throughput | Timp audit $O(N)$ |
| :--- | :---: | :---: | :---: | :---: |
| 100 voturi | 184 ms | 1,84 ms | 541 voturi/s | 7 ms |
| 1.000 voturi | 1.058 ms | 1,06 ms | 944 voturi/s | 4 ms |
| 5.000 voturi | 3.987 ms | 0,80 ms | 1.254 voturi/s | 7 ms |

## Rulare Locală

1. **Baza de date:** Creează baza `SecureVotingDB` în PostgreSQL și rulează `database/init.sql`.
2. **Backend:** Actualizează parola în `backend/VotingRepository.cs`, deschide proiectul în Visual Studio și pornește-l (`F5` — ascultă pe `http://localhost:5127`).
3. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev