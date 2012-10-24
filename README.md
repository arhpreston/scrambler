# Scrambler

Calculate all possible words (and their score) for a given game of
scramble.

The scramble board is a graph. The program works by generating all
possible paths through the graph while ensuring no node is visited
more than once, and that every path retains the potential to be a
word.

Words are taken from the official
[scrabble dictionary](http://www.isc.ro/en/commands/lists.html). On
startup they are stored in a [trie](http://en.wikipedia.org/wiki/Trie)
for fast (`O(1)`) lookup.

## Usage

To simulate the following game

![UNPG,RIAE,EAYS,TSTO](https://raw.github.com/arhpreston/scrambler/master/static/example.png "Scramble! [UNPG,RIAE,EAYS,TSTO]")

Go to http://preston.co.nz/scrambler.html or run

    $ python scrambler.py UNPG,RIAE,EAYS,TSTO -tl 8 -tw 9 -tl 10 -tl 14

After a few seconds an ordered (by score) list of all possible words
will be printed:

    64 64 PIRAYAS       [2, 5, 4, 9, 10, 6, 11]
    124 60 YAREST       [10, 9, 4, 8, 13, 14]
    ...
    5800 2 SO           [11, 15]
    Total words: 312
    Sum (top 20): 985
    Sum (top 50): 2103

For help on the command line

    $ python scrambler.py --help

## Notes

Scramble is available on
[android](https://play.google.com/store/apps/details?id=com.zynga.scramble&hl=en)
and
[ios](http://itunes.apple.com/us/app/scramble-with-friends-free/id485084223?mt=8).
