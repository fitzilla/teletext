// The daily quiz: six general knowledge questions, changing at midnight.
// The bank is shuffled in a fixed order, so every question gets used before
// any comes round again.

import { wrap } from '../markup.js';

// [question, options, index of the right answer]
const BANK = [
  ['What is the capital of Australia?', ['Sydney', 'Canberra', 'Melbourne', 'Perth'], 1],
  ['Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Mercury'], 1],
  ['How many sides does a hexagon have?', ['5', '6', '7', '8'], 1],
  ['What is the chemical symbol for gold?', ['Ag', 'Au', 'Gd', 'Go'], 1],
  ['Who painted the Mona Lisa?', ['Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Botticelli'], 2],
  ['What is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 3],
  ['In which year was the Battle of Hastings?', ['1066', '1215', '1314', '1485'], 0],
  ['How many players does a football team have on the pitch?', ['9', '10', '11', '12'], 2],
  ['What is the longest river in the UK?', ['Thames', 'Severn', 'Trent', 'Tyne'], 1],
  ['What is the smallest prime number?', ['0', '1', '2', '3'], 2],
  ['Who wrote Pride and Prejudice?', ['Charlotte Bronte', 'Jane Austen', 'George Eliot', 'Mary Shelley'], 1],
  ['Which is the hardest natural substance?', ['Quartz', 'Diamond', 'Granite', 'Topaz'], 1],
  ['Which gas do plants take in for photosynthesis?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], 2],
  ['What is the capital of Canada?', ['Toronto', 'Vancouver', 'Ottawa', 'Montreal'], 2],
  ['How many bones are in the adult human body?', ['186', '206', '226', '246'], 1],
  ['Which country gave the Statue of Liberty to the USA?', ['France', 'Britain', 'Spain', 'Italy'], 0],
  ['In which city is the Colosseum?', ['Athens', 'Rome', 'Naples', 'Istanbul'], 1],
  ['At what temperature does water freeze in Fahrenheit?', ['0', '32', '100', '212'], 1],
  ['Who was the first person to walk on the Moon?', ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'John Glenn'], 2],
  ['What is the largest planet in our solar system?', ['Saturn', 'Jupiter', 'Neptune', 'Earth'], 1],
  ['Which instrument usually has 88 keys?', ['Organ', 'Accordion', 'Piano', 'Harpsichord'], 2],
  ['What is the main language spoken in Brazil?', ['Spanish', 'Portuguese', 'French', 'English'], 1],
  ['How many minutes are there in a day?', ['1,140', '1,240', '1,400', '1,440'], 3],
  ['Which blood cells fight infection?', ['Red blood cells', 'White blood cells', 'Platelets', 'Plasma'], 1],
  ['What is the tallest mountain above sea level?', ['K2', 'Kangchenjunga', 'Everest', 'Kilimanjaro'], 2],
  ['Who wrote Romeo and Juliet?', ['Christopher Marlowe', 'William Shakespeare', 'Charles Dickens', 'Geoffrey Chaucer'], 1],
  ['What is the currency of Japan?', ['Yuan', 'Won', 'Yen', 'Ringgit'], 2],
  ['What is the square root of 144?', ['11', '12', '13', '14'], 1],
  ['The Angel of the North stands in which town?', ['Gateshead', 'Sunderland', 'Durham', 'Hexham'], 0],
  ['How many continents are there?', ['5', '6', '7', '8'], 2],
  ['What is the fastest land animal?', ['Lion', 'Cheetah', 'Pronghorn', 'Greyhound'], 1],
  ['Who developed the theory of relativity?', ['Isaac Newton', 'Albert Einstein', 'Niels Bohr', 'Stephen Hawking'], 1],
  ['In which year did the Titanic sink?', ['1905', '1912', '1918', '1923'], 1],
  ['The Great Barrier Reef lies off which country?', ['Indonesia', 'Australia', 'Philippines', 'Fiji'], 1],
  ['How many strings does a violin have?', ['4', '5', '6', '7'], 0],
  ['Which vitamin does your skin make in sunlight?', ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'], 3],
  ['What is the capital of Spain?', ['Barcelona', 'Madrid', 'Seville', 'Valencia'], 1],
  ['Who was Prime Minister for most of the Second World War?', ['Neville Chamberlain', 'Clement Attlee', 'Winston Churchill', 'Anthony Eden'], 2],
  ['What is the largest organ of the human body?', ['Liver', 'Skin', 'Brain', 'Lungs'], 1],
  ['How many degrees are in a right angle?', ['45', '90', '180', '360'], 1],
  ['Which planet has the most famous rings?', ['Uranus', 'Saturn', 'Neptune', 'Mars'], 1],
  ['What is the capital of Scotland?', ['Glasgow', 'Edinburgh', 'Aberdeen', 'Dundee'], 1],
  ['Who discovered penicillin?', ['Louis Pasteur', 'Alexander Fleming', 'Joseph Lister', 'Edward Jenner'], 1],
  ['What is the great bell in the Elizabeth Tower called?', ['Big Ben', 'Great Tom', 'Great Paul', 'Little John'], 0],
  ['At what temperature does water boil at sea level, in Celsius?', ['90', '100', '110', '120'], 1],
  ['In which country are the pyramids of Giza?', ['Mexico', 'Egypt', 'Sudan', 'Peru'], 1],
  ['How many hearts does an octopus have?', ['1', '2', '3', '4'], 2],
  ['Which band released Wonderwall?', ['Blur', 'Oasis', 'Pulp', 'Suede'], 1],
  ['Who had a 1989 hit with Like a Prayer?', ['Cher', 'Madonna', 'Cyndi Lauper', 'Whitney Houston'], 1],
  ['What is the largest hot desert in the world?', ['Gobi', 'Kalahari', 'Sahara', 'Arabian'], 2],
  ['Which metal is liquid at room temperature?', ['Lead', 'Mercury', 'Tin', 'Zinc'], 1],
  ['How many years does a golden anniversary celebrate?', ['25', '40', '50', '60'], 2],
  ['The Strait of Gibraltar links the Atlantic to which sea?', ['Red Sea', 'Black Sea', 'Mediterranean', 'Caspian Sea'], 2],
  ['Who wrote the novel 1984?', ['Aldous Huxley', 'George Orwell', 'H G Wells', 'Ray Bradbury'], 1],
  ['What is 15 per cent of 200?', ['15', '30', '35', '45'], 1],
  ['What is the capital of Ireland?', ['Cork', 'Dublin', 'Galway', 'Limerick'], 1],
  ['Who composed the Moonlight Sonata?', ['Mozart', 'Beethoven', 'Chopin', 'Bach'], 1],
  ['Which animal is called the ship of the desert?', ['Horse', 'Camel', 'Llama', 'Donkey'], 1],
  ['Which planet is closest to the Sun?', ['Venus', 'Mercury', 'Mars', 'Earth'], 1],
  ['How many players are in a rugby union team on the field?', ['11', '13', '15', '7'], 2],
  ['Which city hosted the 2012 Summer Olympics?', ['Beijing', 'London', 'Rio de Janeiro', 'Athens'], 1],
  ['Who wrote A Christmas Carol?', ['Thomas Hardy', 'Charles Dickens', 'Anthony Trollope', 'W M Thackeray'], 1],
  ["Which gas makes up most of the Earth's air?", ['Oxygen', 'Nitrogen', 'Argon', 'Carbon dioxide'], 1],
  ['Which river flows through Newcastle?', ['Wear', 'Tees', 'Tyne', 'Tweed'], 2],
  ['How many legs does a spider have?', ['6', '8', '10', '12'], 1],
  ['What is the capital of Japan?', ['Kyoto', 'Osaka', 'Tokyo', 'Hiroshima'], 2],
  ['Who wrote On the Origin of Species?', ['Gregor Mendel', 'Charles Darwin', 'Isaac Newton', 'Louis Pasteur'], 1],
  ['In which year did the Second World War end?', ['1918', '1939', '1945', '1950'], 2],
  ['How many sides does an octagon have?', ['6', '7', '8', '10'], 2],
  ['What is the chemical symbol for sodium?', ['So', 'Sd', 'Na', 'Nt'], 2],
  ['Which Beatle was the drummer?', ['John Lennon', 'Paul McCartney', 'George Harrison', 'Ringo Starr'], 3],
  ['What is the largest mammal?', ['African elephant', 'Blue whale', 'Sperm whale', 'Giraffe'], 1],
  ['Which country has a maple leaf on its flag?', ['Canada', 'Sweden', 'Switzerland', 'Austria'], 0],
  ['How many hours are in a week?', ['148', '168', '178', '186'], 1],
  ['Which language has the most native speakers?', ['Spanish', 'English', 'Mandarin Chinese', 'Hindi'], 2],
  ['Which Shakespeare play has the line To be, or not to be?', ['Macbeth', 'Hamlet', 'Othello', 'King Lear'], 1],
  ['Who painted The Starry Night?', ['Claude Monet', 'Vincent van Gogh', 'Pablo Picasso', 'Paul Cezanne'], 1],
  ['What is the capital of Italy?', ['Milan', 'Rome', 'Venice', 'Florence'], 1],
  ['Which is the longest motorway in the UK?', ['M1', 'M6', 'M4', 'M25'], 1],
  ['How many squares are on a chessboard?', ['32', '49', '64', '81'], 2],
  ['What is the name of our galaxy?', ['Andromeda', 'Milky Way', 'Triangulum', 'Sombrero'], 1],
  ["What is Newcastle United's nickname?", ['The Magpies', 'The Owls', 'The Black Cats', 'The Canaries'], 0],
  ['Which element has the symbol Fe?', ['Fluorine', 'Iron', 'Lead', 'Francium'], 1],
  ['Who was granted the first telephone patent in 1876?', ['Thomas Edison', 'Alexander Graham Bell', 'Guglielmo Marconi', 'Nikola Tesla'], 1],
  ['How many days are in a leap year?', ['364', '365', '366', '367'], 2],
  ['Mount Kilimanjaro is in which country?', ['Kenya', 'Tanzania', 'Uganda', 'Ethiopia'], 1],
  ['In which sport would you see a slam dunk?', ['Volleyball', 'Basketball', 'Tennis', 'Netball'], 1],
  ['What is the capital of Germany?', ['Munich', 'Berlin', 'Frankfurt', 'Hamburg'], 1],
  ['How many zeros are in one million?', ['5', '6', '7', '8'], 1],
  ['Which vitamin are oranges famous for?', ['Vitamin A', 'Vitamin C', 'Vitamin E', 'Vitamin K'], 1],
];

export const PER_DAY = 6;
const DAYS_PER_CYCLE = Math.floor(BANK.length / PER_DAY);

function shuffled(seed) {
  let s = (seed * 2654435761) % 2147483647 || 1;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const order = BANK.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// Days since 1 Jan 1970 in the viewer's own time zone.
function dayNumber(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

export function questionsFor(date) {
  const day = dayNumber(date);
  const order = shuffled(Math.floor(day / DAYS_PER_CYCLE));
  const start = (day % DAYS_PER_CYCLE) * PER_DAY;
  return order.slice(start, start + PER_DAY).map((i) => BANK[i]);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const banner = (d) => [
  `{magenta}{newbg}{dh}{white} DAILY QUIZ {yellow}${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
  '',
];

const quiz = {
  number: 150,
  cycle: 40,
  tips: {
    keys: [['V', 'reveal answer'], ['→', 'next question'], ['H', 'hold']],
    touch: [['123 then ?', 'reveal answer'], ['Tap', 'next question']],
  },
  fastext: [['Index', 100], ['News', 101], ['NUFC', 340], ['Help', 105]],
  render() {
    const today = new Date();
    return questionsFor(today).map(([q, options, answer], i) => [
      ...banner(today),
      '',
      `{cyan}QUESTION ${i + 1} OF ${PER_DAY}  {white}New questions daily`,
      '',
      ...wrap(q, 38).flatMap((l) => [`{dh}{white}${l}`, '']),
      '',
      ...options.flatMap((o, j) => [`{yellow} ${'ABCD'[j]}{white}${o}`, '']),
      '{green}Press V to reveal the answer.',
      '{green}Press → for the next question.',
      '',
      `{white}ANSWER:{yellow}{conceal}${'ABCD'[answer]} - ${options[answer]}`,
    ]);
  },
};

export { BANK };
export default [quiz];
