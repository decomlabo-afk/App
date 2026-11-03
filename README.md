# Yes, I will be a millionaire.

Une affirmation. Un bouton : **« It's a certainty — €1 »** (textes de l'app en anglais).
Paiement par **Apple Pay**, **Google Pay** ou **carte bancaire** (via Stripe Checkout).

L'app est une **web app mobile (PWA)** : elle s'adapte au téléphone comme à l'ordinateur et
s'installe sur l'écran d'accueil (iPhone : Partager → « Sur l'écran d'accueil »).

## Contenu

| Fichier | Rôle |
|---|---|
| `server.js` | Serveur Express : crée le paiement Stripe, reçoit le webhook, tient le compteur |
| `public/index.html` | La page principale (affirmation + bouton) |
| `public/thanks.html` | La page affichée après le paiement |
| `public/app.js`, `public/styles.css` | Comportement et design |
| `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg` | Installation en app (PWA) |

## Lancer en local

```bash
npm install
cp .env.example .env      # puis remplis les clés Stripe
npm start                 # http://localhost:3000
```

Sans clé Stripe, la page s'affiche mais le bouton indique que le paiement n'est pas configuré.

## Configurer Stripe (5 minutes)

1. Crée un compte sur https://dashboard.stripe.com (gratuit, Stripe prend une commission par paiement).
2. **Développeurs → Clés API** : copie la clé secrète dans `STRIPE_SECRET_KEY`.
   Commence avec la clé `sk_test_…` et paie avec la carte de test `4242 4242 4242 4242`
   (date future, n'importe quel CVC).
3. **Paramètres → Moyens de paiement** : vérifie que *Cartes*, *Apple Pay* et *Google Pay* sont activés.
   Avec Stripe Checkout, Apple Pay s'affiche tout seul sur Safari / iPhone : aucune vérification de domaine n'est nécessaire.
4. **Développeurs → Webhooks → Ajouter un endpoint** :
   - URL : `https://ton-domaine.fr/api/webhook`
   - Événement : `checkout.session.completed`
   - Copie le secret de signature dans `STRIPE_WEBHOOK_SECRET`.
5. Quand tout fonctionne en test, remplace par la clé `sk_live_…` (compte Stripe activé).

## Mettre en ligne

N'importe quel hébergeur Node.js convient (Render, Railway, Fly.io, un VPS…) :

- Commande de démarrage : `npm start`
- Variables d'environnement : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_URL` (ex. `https://ton-domaine.fr`)
- HTTPS obligatoire pour Apple Pay (fourni d'office par ces hébergeurs).

Le compteur est stocké dans `data/count.json`. Sur un hébergeur sans disque persistant, ajoute un volume
(ou remplace par une base de données) pour ne pas le perdre au redémarrage. Les paiements, eux, restent
toujours visibles dans le dashboard Stripe.

## À savoir

- **App Store / Play Store** : Apple et Google imposent leur propre système de paiement intégré
  (commission jusqu'à 30 %) pour ce type d'achat dans une app native. La version web évite ce problème
  et accepte directement Apple Pay et la carte bancaire.
- **Mentions légales** : en France, un site qui encaisse des paiements doit afficher des mentions légales
  et des CGV. Pense à les ajouter avant de passer en production.
