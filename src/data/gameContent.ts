export interface GameClue {
  id: string;
  name: string;
  artist: string;
  description: string;
  imageUrl: string;
  previewUrl: string;
  albumArt: string;
}

export const MOVIE_CLUES: Omit<GameClue, 'id' | 'previewUrl' | 'albumArt'>[] = [
  {
    name: "The Matrix",
    artist: "The Wachowskis",
    description: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    imageUrl: "The Matrix lobby shootout"
  },
  {
    name: "Inception",
    artist: "Christopher Nolan",
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    imageUrl: "Inception spinning top"
  },
  {
    name: "Interstellar",
    artist: "Christopher Nolan",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    imageUrl: "Interstellar black hole gargantua"
  },
  {
    name: "Pulp Fiction",
    artist: "Quentin Tarantino",
    description: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    imageUrl: "Pulp Fiction dance scene"
  },
  {
    name: "The Dark Knight",
    artist: "Christopher Nolan",
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    imageUrl: "The Dark Knight Joker interrogation"
  },
  {
    name: "Jurassic Park",
    artist: "Steven Spielberg",
    description: "A pragmatic paleontologist visiting an almost complete theme park is tasked with protecting a couple of kids after a power failure causes the park's cloned dinosaurs to run loose.",
    imageUrl: "Jurassic Park T-Rex escape"
  },
  {
    name: "Titanic",
    artist: "James Cameron",
    description: "A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the luxurious, ill-fated R.M.S. Titanic.",
    imageUrl: "Titanic ship bow scene"
  },
  {
    name: "The Lion King",
    artist: "Roger Allers & Rob Minkoff",
    description: "Lion prince Simba and his father are targeted by his bitter uncle, who wants to ascend the throne himself.",
    imageUrl: "The Lion King pride rock"
  },
  {
    name: "Fight Club",
    artist: "David Fincher",
    description: "An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.",
    imageUrl: "Fight Club soap"
  },
  {
    name: "Forrest Gump",
    artist: "Robert Zemeckis",
    description: "The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.",
    imageUrl: "Forrest Gump bench chocolate"
  },
  {
    name: "Bad Genius",
    artist: "Nattawut Poonpiriya",
    description: "A top student starts a cheating business that eventually leads her to Sydney, Australia, to take an international exam.",
    imageUrl: "Bad Genius movie exam"
  },
  {
    name: "Pee Mak",
    artist: "Banjong Pisanthanakun",
    description: "A man returns from war to his wife and newborn child, unaware that his village believes his wife is actually a ghost.",
    imageUrl: "Pee Mak movie poster"
  },
  {
    name: "The Godfather",
    artist: "Francis Ford Coppola",
    description: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
    imageUrl: "The Godfather desk scene"
  },
  {
    name: "Spirited Away",
    artist: "Hayao Miyazaki",
    description: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.",
    imageUrl: "Spirited Away bathhouse"
  },
  {
    name: "Parasite",
    artist: "Bong Joon-ho",
    description: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    imageUrl: "Parasite movie peach"
  },
  {
    name: "Ong-Bak: The Thai Warrior",
    artist: "Prachya Pinkaew",
    description: "A village's sacred statue is stolen, and a young martial artist goes to the big city to retrieve it using his Muay Thai skills.",
    imageUrl: "Ong-Bak Tony Jaa"
  },
  {
    name: "Shutter",
    artist: "Banjong Pisanthanakun",
    description: "A young photographer and his girlfriend discover mysterious shadows in their photographs after a tragic accident.",
    imageUrl: "Shutter Thai movie ghost"
  },
  {
    name: "The Medium",
    artist: "Banjong Pisanthanakun",
    description: "A terrifying story of a shaman's inheritance in the Isan region of Thailand, where a family member is possessed by a mysterious entity.",
    imageUrl: "The Medium Thai movie"
  },
  {
    name: "The Shawshank Redemption",
    artist: "Frank Darabont",
    description: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
    imageUrl: "Shawshank Redemption rain scene"
  },
  {
    name: "Gladiator",
    artist: "Ridley Scott",
    description: "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.",
    imageUrl: "Gladiator wheat field"
  },
  {
    name: "The Avengers",
    artist: "Joss Whedon",
    description: "Earth's mightiest heroes must come together and learn to fight as a team if they are going to stop the mischievous Loki and his alien army from enslaving humanity.",
    imageUrl: "Avengers New York battle"
  },
  {
    name: "Harry Potter and the Sorcerer's Stone",
    artist: "Chris Columbus",
    description: "An orphaned boy enrolls in a school of wizardry, where he learns the truth about himself, his family and the terrible evil that haunts the magical world.",
    imageUrl: "Harry Potter Hogwarts Express"
  },
  {
    name: "Star Wars: Episode IV - A New Hope",
    artist: "George Lucas",
    description: "Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy from the Empire's world-destroying battle station.",
    imageUrl: "Star Wars binary sunset"
  }
];

export const CARTOON_CLUES: Omit<GameClue, 'id' | 'previewUrl' | 'albumArt'>[] = [
  {
    name: "Mickey Mouse",
    artist: "Walt Disney",
    description: "The iconic cheerful mouse who often wears red shorts, large yellow shoes, and white gloves.",
    imageUrl: "Mickey Mouse Steamboat Willie"
  },
  {
    name: "Tom and Jerry",
    artist: "William Hanna & Joseph Barbera",
    description: "A series of comedy short films created in 1940 that centers on the rivalry between a cat and a mouse.",
    imageUrl: "Tom and Jerry chase"
  },
  {
    name: "SpongeBob SquarePants",
    artist: "Stephen Hillenburg",
    description: "A yellow sea sponge who lives in a pineapple under the sea in the city of Bikini Bottom.",
    imageUrl: "SpongeBob SquarePants pineapple house"
  },
  {
    name: "The Simpsons",
    artist: "Matt Groening",
    description: "The satirical adventures of a working-class family in the misfit city of Springfield.",
    imageUrl: "The Simpsons couch gag"
  },
  {
    name: "Doraemon",
    artist: "Fujiko F. Fujio",
    description: "A robotic cat from the 22nd century who travels back in time to help a young boy named Nobita.",
    imageUrl: "Doraemon anywhere door"
  },
  {
    name: "Pokémon",
    artist: "Satoshi Tajiri",
    description: "A young trainer named Ash Ketchum embarks on a journey to become a Pokémon Master with his partner Pikachu.",
    imageUrl: "Pikachu thunderbolt"
  },
  {
    name: "Ben 10",
    artist: "Man of Action",
    description: "A 10-year-old boy discovers a mysterious watch-like device that allows him to transform into various alien life forms.",
    imageUrl: "Ben 10 omnitrix"
  },
  {
    name: "The Powerpuff Girls",
    artist: "Craig McCracken",
    description: "Three superpowered little girls created in a lab from sugar, spice, and everything nice, plus Chemical X.",
    imageUrl: "The Powerpuff Girls flying"
  },
  {
    name: "Scooby-Doo",
    artist: "Joe Ruby & Ken Spears",
    description: "A group of teenagers and their talking Great Dane travel in the Mystery Machine to solve supernatural mysteries.",
    imageUrl: "Scooby-Doo Mystery Machine"
  },
  {
    name: "Adventure Time",
    artist: "Pendleton Ward",
    description: "The adventures of a boy named Finn and his best friend Jake, a dog with magical powers to change shape and size.",
    imageUrl: "Adventure Time Finn and Jake"
  },
  {
    name: "Naruto",
    artist: "Masashi Kishimoto",
    description: "A young ninja who seeks recognition from his peers and dreams of becoming the Hokage, the leader of his village.",
    imageUrl: "Naruto hidden leaf village"
  },
  {
    name: "Dragon Ball Z",
    artist: "Akira Toriyama",
    description: "The adventures of Goku who, along with his companions, defends the Earth against an assortment of villains.",
    imageUrl: "Goku super saiyan"
  },
  {
    name: "Avatar: The Last Airbender",
    artist: "Michael Dante DiMartino & Bryan Konietzko",
    description: "A young boy must master the four elements to stop the Fire Nation from conquering the world.",
    imageUrl: "Aang avatar state"
  },
  {
    name: "Rick and Morty",
    artist: "Justin Roiland & Dan Harmon",
    description: "The misadventures of a cynical mad scientist and his good-hearted but fretful grandson.",
    imageUrl: "Rick and Morty portal"
  },
  {
    name: "Phineas and Ferb",
    artist: "Dan Povenmire & Jeff 'Swampy' Marsh",
    description: "Two stepbrothers build grand inventions in their backyard while their pet platypus works as a secret agent.",
    imageUrl: "Phineas and Ferb roller coaster"
  },
  {
    name: "Family Guy",
    artist: "Seth MacFarlane",
    description: "In a wacky Rhode Island town, a dysfunctional family strive to cope with everyday life as they are thrown from one crazy scenario to another.",
    imageUrl: "Family Guy Peter Griffin"
  },
  {
    name: "South Park",
    artist: "Trey Parker & Matt Stone",
    description: "Follows the misadventures of four irreverent grade-schoolers in the quiet, dysfunctional town of South Park, Colorado.",
    imageUrl: "South Park characters"
  },
  {
    name: "Futurama",
    artist: "Matt Groening",
    description: "Philip J. Fry, a pizza delivery boy, is accidentally frozen in 1999 and thawed out on New Year's Eve 2999.",
    imageUrl: "Futurama Planet Express ship"
  }
];

export const LANDMARK_CLUES: Omit<GameClue, 'id' | 'previewUrl' | 'albumArt'>[] = [
  {
    name: "Eiffel Tower",
    artist: "Paris, France",
    description: "An iron lattice tower on the Champ de Mars, named after the engineer whose company designed and built the tower.",
    imageUrl: "Eiffel Tower Paris"
  },
  {
    name: "Great Wall of China",
    artist: "China",
    description: "A series of fortifications that were built across the historical northern borders of ancient Chinese states.",
    imageUrl: "Great Wall of China landscape"
  },
  {
    name: "Statue of Liberty",
    artist: "New York City, USA",
    description: "A colossal neoclassical sculpture on Liberty Island in New York Harbor.",
    imageUrl: "Statue of Liberty New York"
  },
  {
    name: "Sydney Opera House",
    artist: "Sydney, Australia",
    description: "A multi-venue performing arts centre in Sydney, located on the foreshore of Sydney Harbour.",
    imageUrl: "Sydney Opera House night"
  },
  {
    name: "Wat Phra Kaew",
    artist: "Bangkok, Thailand",
    description: "Commonly known in English as the Temple of the Emerald Buddha, it is regarded as the most sacred Buddhist temple in Thailand.",
    imageUrl: "Wat Phra Kaew Bangkok"
  },
  {
    name: "Big Ben",
    artist: "London, UK",
    description: "The nickname for the Great Bell of the striking clock at the north end of the Palace of Westminster.",
    imageUrl: "Big Ben London"
  },
  {
    name: "Taj Mahal",
    artist: "Agra, India",
    description: "An ivory-white marble mausoleum on the right bank of the river Yamuna.",
    imageUrl: "Taj Mahal India"
  },
  {
    name: "Colosseum",
    artist: "Rome, Italy",
    description: "An oval amphitheatre in the centre of the city of Rome, Italy, just east of the Roman Forum.",
    imageUrl: "Colosseum Rome"
  },
  {
    name: "Machu Picchu",
    artist: "Cusco Region, Peru",
    description: "A 15th-century Inca citadel located in the Eastern Cordillera of southern Peru on a 2,430-meter mountain ridge.",
    imageUrl: "Machu Picchu Peru"
  },
  {
    name: "Pyramids of Giza",
    artist: "Giza, Egypt",
    description: "The oldest and largest of the three pyramids in the Giza pyramid complex bordering present-day Giza in Greater Cairo.",
    imageUrl: "Pyramids of Giza Egypt"
  },
  {
    name: "Christ the Redeemer",
    artist: "Rio de Janeiro, Brazil",
    description: "An Art Deco statue of Jesus Christ, created by French sculptor Paul Landowski.",
    imageUrl: "Christ the Redeemer Rio"
  },
  {
    name: "Grand Canyon",
    artist: "Arizona, USA",
    description: "A steep-sided canyon carved by the Colorado River in Arizona, United States.",
    imageUrl: "Grand Canyon Arizona"
  },
  {
    name: "Mount Fuji",
    artist: "Honshu, Japan",
    description: "An active stratovolcano that last erupted in 1707–1708, and the highest mountain in Japan.",
    imageUrl: "Mount Fuji Japan"
  },
  {
    name: "Great Barrier Reef",
    artist: "Queensland, Australia",
    description: "The world's largest coral reef system composed of over 2,900 individual reefs and 900 islands.",
    imageUrl: "Great Barrier Reef aerial"
  },
  {
    name: "Ayutthaya Historical Park",
    artist: "Ayutthaya, Thailand",
    description: "Covers the ruins of the old city of Ayutthaya, which was the capital of the kingdom of the same name.",
    imageUrl: "Ayutthaya Historical Park ruins"
  },
  {
    name: "Petra",
    artist: "Ma'an, Jordan",
    description: "A historical and archaeological city in southern Jordan, famous for its rock-cut architecture and water conduit system.",
    imageUrl: "Petra Jordan Treasury"
  },
  {
    name: "Leaning Tower of Pisa",
    artist: "Pisa, Italy",
    description: "The campanile, or freestanding bell tower, of the cathedral of the Italian city of Pisa, known worldwide for its nearly four-degree lean.",
    imageUrl: "Leaning Tower of Pisa"
  },
  {
    name: "Golden Gate Bridge",
    artist: "San Francisco, USA",
    description: "A suspension bridge spanning the Golden Gate, the one-mile-wide strait connecting San Francisco Bay and the Pacific Ocean.",
    imageUrl: "Golden Gate Bridge San Francisco"
  }
];
