// Repli utilisé si /api/games n'est pas joignable (ex: aperçu statique local)
// Chaque jeu : { id, titre, steamUrl, image, note (sur 20), genre, dateSortie, dateSortieRaw, description }
const SEED_GAMES = [
  {
    id: "withering-realms",
    titre: "Withering Realms",
    steamUrl: "https://store.steampowered.com/app/3441990/Withering_Realms/",
    image: "images/withering-realms.jpg",
    note: 14.8,
    genre: "Action RPG, Horreur",
    dateSortie: "4 sept. 2026",
    dateSortieRaw: "2026-09-04",
    description: "Une fillette fantôme et sa poupée-gardienne explorent la ville hantée de Penwyll dans ce RPG d'action horrifique, en accès anticipé.",
  },
];
