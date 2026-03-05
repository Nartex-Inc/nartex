# Infrastructure Nartex — Explications & Comparaison

**Audience :** Direction / CEO
**Date :** 2026-03-05
**Auteur :** Nicolas Labranche

---

## 1. Comment Nartex est hébergé aujourd'hui

Nartex roule sur **Amazon Web Services (AWS)** au Canada (Montréal, `ca-central-1`).

Voici, en termes simples, ce qui se passe quand un développeur pousse du code :

```
Code poussé sur GitHub
        │
        ▼
  AWS CodeBuild          ← Compile le code, crée un « conteneur » Docker
        │
        ▼
  AWS ECR                ← Entrepose l'image Docker (comme un coffre-fort d'images)
        │
        ▼
  AWS ECS (Fargate)      ← Démarre le conteneur automatiquement
        │
        ▼
  ALB (Load Balancer)    ← Distribue le trafic vers app.nartex.ca / dev.nartex.ca
        │
        ▼
  AWS RDS (PostgreSQL)   ← Base de données gérée par AWS
```

### Les pièces clés en langage simple

| Composante | Rôle en un mot | Analogie |
|---|---|---|
| **Docker** | Emballe l'application dans une « boîte » portable | Un conteneur maritime : tout est dedans, ça roule partout |
| **ECR** | Entrepose les boîtes Docker | Un entrepôt de conteneurs |
| **ECS + Fargate** | Fait tourner les boîtes sans serveur à gérer | Un chauffeur qui conduit le camion pour vous |
| **ALB** | Répartit les visiteurs entre les copies de l'app | Un aiguilleur de trafic |
| **RDS** | Base de données gérée (backups, mises à jour auto) | Un coffre-fort de données avec un gardien 24/7 |
| **Secrets Manager** | Garde les mots de passe chiffrés | Un coffre-fort numérique |
| **CodeBuild** | Pipeline automatique : code → image → déploiement | Une chaîne de montage automatisée |
| **ACM** | Certificat SSL wildcard (`*.nartex.ca`) | Le cadenas vert dans le navigateur |

### Ce que ça coûte (estimé mensuel)

| Service | Coût estimé |
|---|---|
| ECS Fargate (prod 2 tasks + dev 1 task) | ~80–120 $ |
| RDS PostgreSQL (db.t3.micro) | ~30–50 $ |
| ALB | ~25–35 $ |
| ECR, Secrets Manager, CodeBuild | ~10–20 $ |
| **Total estimé** | **~150–225 $/mois** |

---

## 2. L'alternative : un VPS simple (OVH, DigitalOcean, Hetzner)

Un **VPS** (Virtual Private Server), c'est louer un serveur Linux pour un montant fixe. On installe tout soi-même : Node.js, la base de données, les certificats SSL, les backups, etc.

### Ce que ça coûte

| Fournisseur | Specs typiques | Prix |
|---|---|---|
| OVH VPS Starter | 2 vCPU, 4 Go RAM, 80 Go | ~12 $/mois |
| DigitalOcean Droplet | 2 vCPU, 4 Go RAM, 80 Go | ~24 $/mois |
| Hetzner CX31 | 2 vCPU, 8 Go RAM, 80 Go | ~10 $/mois |

---

## 3. Comparaison côte à côte

### Coût

| | AWS ECS/Fargate | VPS (OVH) |
|---|---|---|
| **Coût mensuel** | ~150–225 $ | ~12–30 $ |
| **Verdict** | Plus cher | **Gagnant en prix** |

> **Mais le prix ne raconte pas toute l'histoire.** La question est : *qu'est-ce qu'on obtient pour ce prix ?*

---

### Fiabilité & Disponibilité

| Critère | AWS ECS/Fargate | VPS |
|---|---|---|
| **Uptime garanti** | 99.99 % (SLA AWS) | 99.9 % (meilleur cas) |
| **Si le serveur tombe** | AWS redémarre automatiquement un nouveau conteneur en ~30 secondes | Il faut intervenir manuellement ou espérer que le VPS redémarre seul |
| **Mises à jour de sécurité** | AWS patche l'OS sous-jacent automatiquement (Fargate) | Vous devez le faire vous-même, sinon vulnérable |
| **Surveillance** | CloudWatch intégré (alertes, métriques, logs) | À configurer soi-même |

**Résumé :** Avec AWS, si quelque chose plante la nuit, ça se répare tout seul. Avec un VPS, quelqu'un doit se lever.

---

### Sécurité

| Critère | AWS ECS/Fargate | VPS |
|---|---|---|
| **Secrets (mots de passe, clés API)** | Chiffrés dans Secrets Manager, injectés au démarrage — jamais sur disque | Stockés dans un fichier `.env` sur le serveur |
| **Réseau** | VPC privé, groupes de sécurité, le conteneur n'a pas d'IP publique | Le serveur est directement exposé sur Internet |
| **Base de données** | RDS avec SSL obligatoire, backups auto, pas d'accès direct | PostgreSQL installé sur le même serveur, backup manuel |
| **Certificats SSL** | Gérés et renouvelés automatiquement par ACM | Let's Encrypt à configurer et renouveler (ou payer) |
| **Conformité** | SOC 2, ISO 27001, conformité au Canada (données à Montréal) | Dépend du fournisseur |

**Résumé :** AWS isole chaque couche. Un VPS met tout dans le même panier.

---

### Déploiement & Productivité

| Critère | AWS ECS/Fargate | VPS |
|---|---|---|
| **Déployer une nouvelle version** | `git push` → déploiement automatique en ~10 min | SSH dans le serveur, `git pull`, `npm build`, redémarrer le service |
| **Rollback (revenir en arrière)** | Changer le tag de l'image Docker → 30 secondes | Espérer qu'on a un backup, reconstruire |
| **Deux environnements (dev + prod)** | Même cluster, deux services séparés, zéro effort | Louer un 2e VPS ou tout mettre sur le même (risqué) |
| **Temps développeur requis** | ~0 h/mois pour l'infrastructure | ~4–8 h/mois (mises à jour, monitoring, backups, pannes) |

**Résumé :** Le temps d'un développeur coûte ~75–100 $/h. Si un VPS demande 6 h/mois de maintenance, c'est 450–600 $/mois de temps perdu — bien plus que l'écart de prix.

---

### Scalabilité

| Critère | AWS ECS/Fargate | VPS |
|---|---|---|
| **Plus de trafic ?** | Ajouter des tasks ECS en 1 clic (ou auto-scaling) | Migrer vers un plus gros VPS = downtime |
| **Pic temporaire** | Auto-scaling : AWS ajoute des copies automatiquement | Le serveur ralentit ou tombe |
| **Multi-région** | Possible (ex: déployer aussi en Europe) | Acheter un autre VPS, tout reconfigurer |

---

## 4. Quand un VPS fait du sens

Un VPS est un bon choix quand :

- L'application est un **projet personnel** ou un **prototype**
- Il n'y a **pas de données sensibles** (clients, commandes, prix)
- Le **temps de panne** est acceptable (quelques heures)
- Il y a un développeur disponible pour la **maintenance régulière**
- Le budget est le **seul critère de décision**

---

## 5. Quand AWS ECS/Fargate fait du sens

AWS est le bon choix quand :

- L'application gère des **données d'entreprise** (clients, commandes, finances)
- La **disponibilité** est critique (utilisateurs internes qui dépendent de l'outil)
- On veut un **déploiement automatisé** et des **rollbacks instantanés**
- La **sécurité** et la **conformité** sont des exigences
- Le **temps développeur** est plus précieux que l'écart de prix serveur
- L'application doit **grandir** avec l'entreprise

---

## 6. Verdict pour Nartex

| Facteur | Poids | AWS | VPS |
|---|---|---|---|
| Coût serveur | Moyen | - | + |
| Coût total (incluant temps humain) | Élevé | + | - |
| Sécurité des données | Élevé | + | - |
| Fiabilité / Uptime | Élevé | + | - |
| Vitesse de déploiement | Élevé | + | - |
| Scalabilité | Moyen | + | - |
| Simplicité initiale | Faible | - | + |

### Recommandation

**Nartex est bien positionné sur AWS ECS/Fargate.** L'infrastructure actuelle offre :

1. **Zéro maintenance serveur** — pas de SSH, pas de mises à jour OS, pas de backups manuels
2. **Déploiement en un `git push`** — du code au production en 10 minutes, automatiquement
3. **Sécurité de niveau entreprise** — secrets chiffrés, réseau isolé, SSL automatique, données au Canada
4. **Résilience** — si un conteneur tombe, un nouveau démarre en 30 secondes
5. **Deux environnements** (dev.nartex.ca + app.nartex.ca) sur la même infrastructure, sans surcoût significatif

L'écart de prix (~150 $/mois vs ~20 $/mois) est **largement compensé** par le temps développeur économisé et le niveau de sécurité/fiabilité obtenu. Un seul incident majeur sur un VPS (perte de données, panne prolongée, brèche de sécurité) coûterait bien plus que des années d'hébergement AWS.

> **En résumé :** On paie ~130 $/mois de plus pour dormir tranquille, déployer en 1 clic, et ne jamais toucher à un serveur.

---

*Document généré le 2026-03-05 — Infrastructure Nartex v2*
