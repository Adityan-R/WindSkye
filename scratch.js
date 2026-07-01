const fs = require('fs');

function render(top, bot) {
  console.log(top);
  console.log(bot);
  console.log('');
}

console.log("W:");
render("█▄█▄█", "█▀█▀█");

console.log("I:");
render("█", "█");

console.log("N:");
render("█▄ █", "█ ▀█");

console.log("D:");
render("█▀▄", "█▄▀");
render("█▀█", "█▄▀"); // maybe?

console.log("S:");
render("█▀▀", "▄▄█"); // standard figlet S?
render("█▀▀", "▀▀█");
render("█▀▄", "▄▀█"); 
render("▀▀▄", "▄▄█");

console.log("K:");
render("█ ▄", "█▀ ");
render("█▄▀", "█ ▀");
render("█▄▀", "█▀▄"); // maybe?

console.log("Y:");
render("█ █", " █ ");
render("█ █", "▀█▀");
render("█▄█", " █ "); // V shape top?

console.log("E:");
render("█▀▀", "█▄▄");

console.log("WINDSKYE:");
render("█▄█▄█ █ █▄ █ █▀▄ █▀▀ █▄▀ █ █ █▀▀", "█▀█▀█ █ █ ▀█ █▄▀ ▄▄█ █ ▀ ▀█▀ █▄▄");
