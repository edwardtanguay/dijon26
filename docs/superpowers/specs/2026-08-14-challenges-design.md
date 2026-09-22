# Conception : Gestion des Défis et Contacts (Dijon26)

## 1. Vue d'ensemble & Objectif
Permettre à l'utilisateur de définir et suivre ses défis quotidiens de prise de contact (musées, personnes, clubs, etc.) à Dijon, qu'ils soient écrits ou oraux.
L'utilisateur peut :
- Configurer son objectif journalier de défis (ex: 10 défis/jour, modifiable à volonté en base de données).
- Suivre en temps réel son statut du jour (défis complétés, défis restants, alerte s'il manque des défis pour atteindre l'objectif).
- Anticiper les jours suivants (ex: défis planifiés pour demain avec indicateur d'état de préparation).
- Accomplir un défi et renseigner immédiatement le bilan dans l'interface ("Récapituler et réfléchir").
- Voir l'historique complet des interactions et notes pour chaque contact.

---

## 2. Modèle de Données (Prisma / SQLite - Turso)

```prisma
model Contact {
  id          String      @id @default(uuid())
  name        String      // Nom de la personne, du musée, du club, etc.
  email       String?
  telephone   String?
  description String?
  challenges  Challenge[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Challenge {
  id                 String    @id @default(uuid())
  contactId          String
  contact            Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)
  text               String    // Texte court du défi (< 255 caractères)
  type               String    // "written" | "spoken"
  scheduledFor       DateTime? // Date prévue (YYYY-MM-DD)
  completedAt        DateTime? // Horodatage d'accomplissement
  afterChallengeNotes String?   // Récapitulatif et réflexion (notes après défi)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}

model AppSetting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

*Note sur `AppSetting`* : Clé par défaut `daily_challenge_target` avec valeur `"10"`.

---

## 3. Architecture des API Nuxt (`/server/api`)

- **Paramètres** :
  - `GET /api/settings` : Récupère les paramètres de l'application (ex: `dailyChallengeTarget`).
  - `POST /api/settings` : Met à jour un paramètre.
- **Contacts** :
  - `GET /api/contacts` : Liste des contacts avec le décompte/historique de leurs défis.
  - `POST /api/contacts` : Création/mise à jour d'un contact.
  - `DELETE /api/contacts/:id` : Suppression d'un contact.
- **Challenges** :
  - `GET /api/challenges` : Récupération des défis avec filtres (ex: `date=today`, `date=tomorrow`, `contactId=...`).
  - `POST /api/challenges` : Création d'un nouveau défi (associé à un contact existant ou créé à la volée).
  - `PUT /api/challenges/:id` : Mise à jour d'un défi (texte, type, date).
  - `POST /api/challenges/:id/complete` : Enregistrement de l'accomplissement avec horodatage (`completedAt`) et notes ("Récapituler et réfléchir").
  - `DELETE /api/challenges/:id` : Suppression d'un défi.

---

## 4. Expérience Utilisateur & Interface (`/challenges`)

### Structure de la page `/challenges` (Français, tutoiement)
1. **Bannière d'objectif & Indicateurs du Jour :**
   - Jauge de progression : `X / Y défis réalisés aujourd'hui`.
   - Compteur interactif permettant de modifier l'objectif journalier à la volée.
   - Message d'alerte dynamique :
     - *Exemple :* "Tu as réalisé 3 défis et il t'en reste 3 prévus pour aujourd'hui. Il te manque 4 défis pour atteindre ton objectif de 10 aujourd'hui !"
     - *Exemple pour demain :* "Demain : 3 défis programmés sur un objectif de 10 (il t'en manque 7 pour être prêt)."
2. **Onglets / Sélecteur temporel rapide :**
   - **Aujourd'hui** (vue prioritaire d'action)
   - **Demain / À venir** (pour planifier et préparer)
   - **Historique & Tous**
3. **Liste des Défis :**
   - Badge visuel du type (✍️ *Écrit* ou 🗣️ *Oral*).
   - Nom du contact avec bouton pour ouvrir l'historique.
   - Intitulé court du défi.
   - Bouton d'action principal : **"Terminer & Réfléchir"** (ouvre le formulaire récapitulatif).
4. **Modal / Tiroir "Récapituler et réfléchir" :**
   - Date et heure d'accomplissement (pré-rempli à maintenant).
   - Pour défi écrit : champ structuré pour coller l'e-mail envoyé + détails/difficultés.
   - Pour défi oral : champ de débriefing (comment ça s'est passé, apprentissages, points de blocage).
   - Historique des défis précédents avec ce même contact affiché en dessous pour contexte immédiat.
5. **Modal / Tiroir Fiche Contact & Historique :**
   - Coordonnées (nom, e-mail, téléphone, description).
   - Historique chronologique de toutes les interactions passées et notes.
6. **Formulaire d'ajout rapide de défi :**
   - Sélection ou création rapide d'un contact.
   - Saisie du texte (< 255 caractères) et choix du type (écrit / oral).
   - Choix de la date (aujourd'hui par défaut, demain, ou date personnalisée).

---

## 5. Navigation
- Ajout de l'entrée **"Défis"** (`/challenges`) dans le menu de navigation principal `Navigation.vue` avec une icône adaptée (`i-heroicons-sparkles` ou `i-heroicons-trophy`).
