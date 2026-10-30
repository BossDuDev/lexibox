# Lexibox

Un petit site pour apprendre du vocabulaire en anglais ou en espagnol. Tu rentres ta liste de mots, le site te donne le mot en français, tu tapes la traduction. Ça pétille quand tu as juste, ça tremble quand tu te rates, et les points s'accumulent pour te donner envie de revenir demain.

Tout est statique (HTML, CSS, JavaScript). Ça tourne sur GitHub Pages. Les comptes et les leçons sont stockés chez Supabase, dans la formule gratuite.

## Ce que ça fait

- Deux langues, anglais et espagnol, avec un interrupteur en haut de page.
- Un quiz avec effets sonores, confettis, séries de bonnes réponses, barre de progression. Les mots ratés reviennent en fin de partie.
- Des points et une série de jours consécutifs.
- Des leçons privées ou publiques, au choix à la création.
- Un onglet Communauté pour chercher les leçons publiques et les ajouter à ses leçons.
- Des catégories à toi, avec la couleur que tu veux, pour trier tes leçons.
- Un mode invité : on peut regarder la communauté sans compte. Le reste demande de se connecter.

## Comment ça se comporte

Quand tu ajoutes une leçon publique, tu en reçois une copie. Tu peux la modifier à ta guise, l'original ne bouge pas.

Si tu es l'auteur d'une leçon publique, tes modifications changent la leçon pour tout le monde, et son numéro de version monte. Ceux qui l'avaient copiée voient alors un bouton « Mettre à jour » qui montre ce qui change (mots ajoutés en vert, mots retirés en rouge) avant d'appliquer quoi que ce soit.

## Les fichiers

```
index.html          la page, presque vide : tout s'affiche depuis app.js
css/style.css       le style et les animations
js/app.js           toute la logique (quiz, leçons, communauté, comptes)
js/config.js        l'adresse et la clé de ton projet Supabase
supabase.sql        les tables et les règles de sécurité, à lancer une fois
```

## Mise en route

### 1. Supabase

1. Crée un projet gratuit sur [supabase.com](https://supabase.com).
2. Ouvre SQL Editor, colle tout `supabase.sql`, clique sur Run.
3. Ouvre Project Settings, puis API. Copie l'URL du projet, puis dans API Keys la « Publishable key » (`sb_publishable_...`). Sur un vieux projet, c'est la clé `anon public`.
4. Colle-les dans `js/config.js`.

La clé publishable (ou `anon`) peut rester dans le code du site, elle est faite pour ça. La sécurité repose sur les règles du fichier SQL : chacun ne lit que ses leçons privées, et seul l'auteur modifie ou supprime les siennes. Ne mets jamais une clé « secret » ni la clé `service_role` dans le dépôt.

### 2. GitHub Pages

1. Mets le contenu du dossier à la racine d'un dépôt (`index.html` à la racine, pas dans un sous-dossier).
2. Settings, puis Pages. Choisis la branche `main` et le dossier `/ (root)`.
3. Attends une ou deux minutes. L'adresse apparaît en haut de la page de réglages.

### 3. Relier les deux

Dans Supabase, Authentication, puis URL Configuration, mets l'adresse de ton site dans « Site URL ». Sans ça, les liens de confirmation par email pointent au mauvais endroit.

Pour tester sans attendre un mail à chaque inscription, tu peux désactiver « Confirm email » dans Authentication, Providers, Email. À remettre avant d'inviter du monde.

## Utilisation

Crée un compte, puis « Nouvelle leçon ». Une ligne par mot, le français d'abord, la traduction ensuite, séparés par `=` :

```
le chat = cat
la maison = house
le billet = ticket / bill
```

Les traductions alternatives se séparent par `/`. Les accents et les majuscules ne comptent pas dans les réponses.

## Si ça ne marche pas

- Page blanche ou rien ne se charge : ouvre la console du navigateur (F12) et regarde l'erreur en rouge. Le plus souvent, `js/config.js` n'est pas rempli ou un fichier n'est pas au bon endroit.
- « Invalid API key » : la clé collée dans `config.js` est incomplète ou ce n'est pas la clé publishable (ou `anon`).
- L'inscription réussit mais impossible de se connecter : l'email n'est pas confirmé, ou l'adresse du site manque dans URL Configuration.
- La communauté reste vide : normal tant que personne n'a publié de leçon. Crée-en une, coche publique, elle apparaît.
- Ça marche sur ton adresse GitHub Pages mais pas en double-cliquant sur `index.html` : ouvre-le plutôt avec un petit serveur local (`python3 -m http.server`).

## Limites actuelles

- Pas de récupération de mot de passe dans l'interface.
- Pas de cœurs ni de niveaux.
- Les points ne sont pas protégés contre la triche : un utilisateur motivé peut modifier son propre score. Ça n'affecte que lui.
- Si un auteur supprime une leçon publique, les copies déjà faites restent chez les autres, mais elles ne reçoivent plus de mises à jour.
