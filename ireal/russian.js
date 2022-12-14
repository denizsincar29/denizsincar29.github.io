let metadata={
"title":"название",
"composer1":"имя композитора",
"composer2":"фамилия композитора",
"style":"стиль",
"key":"тональность",
"time":"тактовый размер",
"mainlabel":"список аккордов",
"chordkey":"нота аккорда",
"chordfn":"функция аккорда",
"addchord":"добавить аккорд",
"end":"конец списка"
}
let repeats={"x":"повтор","r":"повтор двух предыдущих тактов","n":"stop time"}
let fnlist=["2", "5", "add9", "+", "o", "h", "sus", "^", "-", "^7", "-7", "7", "7sus", "h7", "o7", "^9", "^13", "6", "69", "^7#11", "^9#11", "^7#5", "-6", "-69", "-^7", "-^9", "-9", "-11", "-7b5", "h9", "-b6", "-#5", "9", "7b9", "7#9", "7#11", "7b5", "7#5", "9#11", "9b5", "9#5", "7b13", "7#9#5", "7#9b5", "7#9#11", "7b9#11", "7b9b5", "7b9#5", "7b9#9", "7b9b13", "7alt", "13", "13#11", "13b9", "13#9", "7b9sus", "7susadd3", "9sus", "13sus", "7b13sus", "11"];
let fntlist=["2", "5", "с девятой", "увеличенный", "уменьшенный", "полууменьшенный", "сус", "мейдж", "минор", "мажор септ", "минор септ", "септ", "септ сус", "полууменьшенный септ", "уменьшенный септ", "мажор 9", "мажор 13", "6", "6, 9", "септ плюс11", "9 плюс11", "мажор септ плюс5", "минор 6", "минор 6, 9", "минор с повышенной седьмой", "минор с повышенной седьмой и добавленной девятой", "минор 9", "минор 11", "минор септ минус5", "полууменьшенный 9", "минор минус6", "минор плюс5", "9", "септ минус9", "септ плюс9", "септ плюс11", "септ минус5", "септ плюс5", "9 плюс11", "9 минус5", "9 плюс5", "септ минус13", "септ плюс9 плюс5", "септ плюс9 минус5", "септ плюс9 плюс11", "септ минус9 плюс11", "септ минус9 минус5", "септ минус9 плюс5", "септ минус9 плюс9", "септ минус9 минус13", "септ альтерированный", "13", "13 плюс11", "13 минус9", "13 плюс9", "септ минус9 сус", "септ сус с добавленной третьей", "9 сус", "13 сус", "септ минус13 сус", "11"];
let fndict=new Object;
for(let i=0;i<fnlist.length;i++){fndict[fnlist[i]]=fntlist[i];}
let chordkeys=["C","C#","Db","D","D#","Eb","E","F","F#","Gb","G","G#","Ab","A","A#","Bb","B"];
let key_signatures={
"C":"до мажор",
"Db":"ре-бемоль мажор",
"D":"ре мажор",
"Eb":"ми бемоль мажор",
"E":"ми мажор",
"F":"фа мажор",
"Gb":"соль-бемоль мажор",
"G":"соль мажор",
"Ab":"ля-бемоль мажор",
"A":"ля мажор",
"Bb":"си-бемоль мажор",
"B":"си мажор",
"A-":"ля минор",
"Bb-":"си бемоль минор",
"B-":"си минор",
"C-":"до минор",
"C#-":"до-диез минор",
"D-":"ре минор",
"Eb-":"ми бемоль минор",
"E-":"ми минор",
"F-":"фа минор",
"F#-":"фа-диез минор",
"G-":"соль минор",
"G#-":"соль диез минор"
}
let key_signatures_list=Object.keys(key_signatures);

let barlines={
"|":"тактовая черта",
"[":"открывающая тактовая черта",
"]":"закрывающая тактовая черта",
"{":"начало репризы",
"}":"конец репризы",
"Z":"конец произведения"
}
let barlines_list=Object.keys(barlines);

let time_signatures ={
"T44":"4/4",
"T34":"3/4",
"T24":"2/4",
"T54":"5/4",
"T64":"6/4",
"T74":"7/4",
"T22":"2/2",
"T32":"3/2",
"T58":"5/8",
"T68":"6/8",
"T78":"7/8",
"T98":"9/8",
"T12":"12/8"
}
let time_signatures_list=Object.keys(time_signatures);

let rehearsal={
"*A":"часть А",
"*B":"часть Б",
"*C":"часть Ц",
"*D":"часть Д",
"*V":"припев / повторяющаяся часть",
"S":"сеньо",
"Q":"кода",
"f":"фермата"
}
let rehearsal_list=Object.keys(rehearsal);

let endings={
"N1":"первая вольта",
"N2":"Вторая вольта",
"N3":"Третья вольта",
"N0":"вольта"
}
let endings_list=Object.keys(endings);

let vertical_spaces={
"y":"1 отступ вниз",
"yy":"2 отступа вниз",
"yyy":"3 отступа вниз"
}
let vertical_spaces_list=Object.keys(vertical_spaces);


let styles=["Afro 12/8", "Ballad Double Time Feel", "Ballad Even", "Ballad Melodic", "Ballad Swing", "Blue Note", "Bossa Nova", "Doo Doo Cats", "Double Time Swing", "Even 8ths", "Even 8ths Open", "Even 16ths", "Guitar Trio", "Gypsy Jazz", "Latin", "Latin/Swing", "Long Notes", "Medium Swing", "Medium Up Swing", "Medium Up Swing 2", "New Orleans Swing", "Second Line", "Slow Swing", "Swing Two/Four", "Trad Jazz", "Up Tempo Swing", "Up Tempo Swing 2", "Argentina: Tango", "Brazil: Bossa Acoustic", "Brazil: Bossa Electric", "Brazil: Samba", "Cuba: Bolero", "Cuba: Cha Cha Cha", "Cuba: Son Montuno 2-3", "Cuba: Son Montuno 3-2", "Bluegrass", "Country", "Disco", "Funk", "Glam Funk", "House", "Reggae", "Rock", "Rock 12/8", "RnB", "Shuffle", "Slow Rock", "Smooth", "Soul", "Virtual Funk"];