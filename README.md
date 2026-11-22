# KyllBot Studio Officiel

Studio tout-en-un pour créer des bots Discord et des formations interactives : commandes slash,
embeds, automatisations, cours, quiz, apprenants, certificats, statistiques, équipe et API.

Le projet reprend le meilleur de BotGhost (éditeur de bots) et de Hurix (plateforme de formation)
dans une seule application web.

## Démarrage

```bash
npm install
npm start
```

L'application écoute sur <http://localhost:12000> (variable `PORT` pour changer).

Au premier lancement, `data/db.json` est créé et rempli avec un jeu de données de démonstration
(bots, formations, apprenants, équipe, factures).

## Connexion

Deux méthodes, sans mot de passe :

1. **Code par email** : on saisit son adresse, un code à 6 chiffres est envoyé, il est valable
   10 minutes et à usage unique.
2. **Google** : bouton « Continuer avec Google » (OAuth 2.0, scope `openid email profile`).

Sans configuration d'email, le site tourne en **mode démo** : le code est affiché directement dans
l'interface (et dans les logs du serveur). Le bouton « Explorer la démo » du site public ouvre un
compte de démonstration partagé.

## Configuration

Toutes les variables sont optionnelles en local. Créez un fichier `.env` ou exportez-les dans le
shell avant `npm start` :

| Variable | Rôle |
| --- | --- |
| `PORT` | Port HTTP (défaut `12000`). |
| `PUBLIC_URL` | URL publique utilisée pour les redirections OAuth, ex. `https://studio.exemple.fr`. |
| `AUTH_SECRET` | Secret de hachage des codes et sessions. **À définir en production.** |
| `RESEND_API_KEY` | Clé [Resend](https://resend.com) pour envoyer réellement les codes par email. |
| `MAIL_FROM` | Expéditeur des emails, ex. `KyllBot Studio <no-reply@kyllbot.studio>`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Identifiants OAuth Google. |
| `COOKIE_SECURE=1` | Force le cookie de session en `Secure` (HTTPS). |

### Google OAuth

Dans la console Google Cloud, créez un identifiant « Application Web » et ajoutez l'URI de
redirection autorisée :

```
{PUBLIC_URL}/auth/google/callback
```

En local : `http://localhost:12000/auth/google/callback`.

### Emails

Avec `RESEND_API_KEY`, les codes partent via l'API Resend. Sans clé, aucun email n'est envoyé et le
code est renvoyé dans la réponse `POST /api/auth/request-code` (champ `devCode`) pour permettre de
tester le parcours complet.

## Ce que contient le studio

- **Vue d'ensemble** : activité, graphiques, progression des formations, actions rapides.
- **Mes bots** : création, statut, commandes, automatisations, paramètres, test local.
- **Éditeur de commandes** : nom, description, réponse texte, embed (titre, description, couleur,
  footer), cooldown et aperçu Discord en direct.
- **Formations** : modules, leçons (vidéo, texte, quiz), quiz notés, publication, export.
- **Apprenants** : progression, scores, dernière activité, certificats.
- **Modèles** : bots et formations prêts à installer en un clic.
- **Statistiques** : commandes exécutées, automatisations, taux de complétion.
- **Équipe** : rôles (propriétaire, éditeur, analyste, lecteur), invitations.
- **API & webhooks** : clés API, exemple d'appel, URL de webhook entrant.
- **Facturation** : plan, utilisation, moyen de paiement, factures.
- **Paramètres** : profil, studio, notifications, apparence, sécurité et session.

## Architecture

```
server/
  index.js   API Express, routes, sécurité (CSP, rate limit)
  auth.js    codes email, sessions, Google OAuth
  db.js      persistance JSON (data/db.json)
  seed.js    données de démonstration
public/
  index.html landing, login.html connexion, app.html studio
  css/       site.css (public), app.css (studio)
  js/        auth, core (routeur/UI), vues bots, formations, etc.
```

L'API REST est sous `/api` : `auth`, `me`, `workspace`, `bots`, `commands`, `automations`,
`courses`, `learners`, `team`, `api-keys`, `billing`, `settings`, `stats`, `templates`.

## Sécurité

- Codes de connexion hachés (HMAC), expiration 10 minutes, usage unique, 5 tentatives maximum.
- Sessions opaques : jeton aléatoire stocké haché, cookie `HttpOnly` + `SameSite=Lax`.
- Rate limiting sur l'envoi de codes et la vérification.
- En-têtes CSP, `X-Frame-Options`, `Referrer-Policy`, `nosniff`.
- Aucun secret Discord n'est stocké : les jetons de bots sont générés localement et affichés une
  seule fois.

## Limites connues

- Stockage JSON mono-processus, adapté à la démo et aux petites instances.
- L'envoi réel des emails et la connexion Google nécessitent les clés décrites ci-dessus.
- La facturation et les paiements sont simulés.
