export type Alphabet
  = | "a" | "b" | "c" | "d" | "e" | "f" | "g"
    | "h" | "i" | "j" | "k" | "l" | "m" | "n"
    | "o" | "p" | "q" | "r" | "s" | "t" | "u"
    | "v" | "w" | "x" | "y" | "z"
    | "A" | "B" | "C" | "D" | "E" | "F" | "G"
    | "H" | "I" | "J" | "K" | "L" | "M" | "N"
    | "O" | "P" | "Q" | "R" | "S" | "T" | "U"
    | "V" | "W" | "X" | "Y" | "Z";

export type ContainsAtTheEnd<T extends string, Y extends string> = T extends `${infer Rest}${Y}` ? true : false;
export type ContainsAtTheStart<T extends string, Y extends string> = T extends `${Y}${infer Rest}` ? true : false;

export type RemoveNonAlphabetic<S extends string>
  = S extends `${infer First}${infer Rest}`
    ? First extends Alphabet
      ? `${First}${RemoveNonAlphabetic<Rest>}`
      : RemoveNonAlphabetic<Rest>
    : "";
