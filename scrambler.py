#!/usr/bin/env python
from argparse import ArgumentParser

# The scramble letter values
#
# TODO: need to know the scores for J, K, V, X
SCORES = {
    'A': 1,
    'B': 4,
    'C': 4,
    'D': 2,
    'E': 1,
    'F': 4,
    'G': 3,
    'H': 3,
    'I': 1,
    'J': 0,
    'K': 0,
    'L': 2,
    'M': 4,
    'N': 2,
    'O': 1,
    'P': 4,
    'Q': 10,
    'R': 1,
    'S': 1,
    'T': 1,
    'U': 2,
    'V': 0,
    'W': 4,
    'X': 0,
    'Y': 3,
    'Z': 10
}

# The scramble board is a 4x4 grid:
#
#     /-------------\
#     |  0  1  2  3 |
#     |  4  5  6  7 |
#     |  8  9 10 11 |
#     | 12 13 14 15 |
#     \-------------/
#
# The game can thus be represented by a graph: each point on the grid
# is a vertex and the edges are the adjacent points on the grid.
GRAPH = {
    0: (1, 4, 5),
    1: (0, 2, 4, 5, 6),
    2: (1, 3, 5, 6, 7),
    3: (2, 6, 7),
    4: (0, 1, 5, 8, 9),
    5: (0, 1, 2, 4, 6, 8, 9, 10),
    6: (1, 2, 3, 5, 7, 9, 10, 11),
    7: (2, 3, 6, 10, 11),
    8: (4, 5, 9, 12, 13),
    9: (4, 5, 6, 8, 10, 12, 13, 14),
    10: (5, 6, 7, 9, 11, 13, 14, 15),
    11: (6, 7, 10, 14, 15),
    12: (8, 9, 13),
    13: (8, 9, 10, 12, 14),
    14: (9, 10, 11, 13, 15),
    15: (10, 11, 14),
}

# Scramble uses the scrabble dictionary:
#
#     http://www.isc.ro/en/commands/lists.html
WORD_FILE = 'TWL06.txt'


def normalize_string(value):
    """
    Convert a string containing spaces, carriage returns, etc into a
    stream of upper case letters.

    >>> normalize_string('asdf,ghjk')
    'ASDFGHJK'
    """
    assert isinstance(value, basestring)

    value = value.upper()

    for char in '\'\n\r,-_| ':
        value = value.replace(char, '')

    return value


IS_WORD = 1

def load_dictionary(word_file=WORD_FILE, restrict_to=''):
    """
    Load a file containing a list of words into a trie.

    The scramble dictionary contains n = ~180,000 words. For every
    step of the scramble game we will need to check if the path is a
    word, or could become a word. Therefore lookup needs to be fast.

    With respect to dictionary size, lookup time for an ordered list
    is O(log n), while lookup time for both hashtable (python dict)
    and trie is O(1).

    A trie has the added advantage that partial lookups are possible
    (i.e., it is possible to check if the current string is the root
    of some work).
    """
    trie = {}

    word_count = 0
    restrict_to = set(restrict_to)

    with open(word_file) as f:
        for word in f.readlines():
            word = normalize_string(word)
            if restrict_to and set(word).issubset(restrict_to):
                word_count += 1
                leaf = trie
                for letter in word:
                    leaf = leaf.setdefault(letter, {})
                leaf = leaf.setdefault(IS_WORD, True)

    print 'Dictionary contains %s words' % word_count
    return trie


def calc_score(word, path, **kwargs):
    """
    Mimic the scramble scoring system.

    There is no simple function for this; I had to hard code it.

    >>> calc_score('MEZCAL', range(6))
    28
    >>> calc_score('QUEEN', range(5))
    17
    >>> calc_score('QUEEN', range(5), TL=[0], TW=[3])
    105
    """
    word_len = len(word)
    word = word.replace('QU', 'Q')

    word_score = 0
    word_multiplier = 1

    # Calculate word score
    for letter, index in zip(word, path):
        letter_multiplier = 1
        if index in kwargs.get('DL', []):
            letter_multiplier *= 2
        if index in kwargs.get('TL', []):
            letter_multiplier *= 3
        if index in kwargs.get('DW', []):
            word_multiplier *= 2
        if index in kwargs.get('TW', []):
            word_multiplier *= 3
        letter_score = SCORES[letter]
        word_score += letter_multiplier * letter_score

    # Word length bonus follows a strange function
    if word_len == 10:
        length_bonus = 28
    elif word_len == 9:
        length_bonus = 20
    elif word_len == 8:
        length_bonus = 15
    elif word_len == 7:
        length_bonus = 10
    elif word_len == 6:
        length_bonus = 6
    elif word_len == 5:
        length_bonus = 3
    else:
        length_bonus = 0

    return word_score * word_multiplier + length_bonus


def play_scramble(board, dw=[], dl=[], tw=[], tl=[]):

    word_tree = load_dictionary(restrict_to=board)

    # map WORD => word_path, word_score
    found_words = {}

    def build_paths(graph=GRAPH, path=[], word_tree=word_tree):
        if path:
            node = path[-1]
            new_paths = [path]
            adjacent_nodes = GRAPH[node]
        else:
            new_paths = []
            adjacent_nodes = range(16)

        for adjacent_node in adjacent_nodes:
            if adjacent_node not in path:
                new_path = path + [adjacent_node]
                new_letter = board[adjacent_node]

                if new_letter in word_tree:
                    if IS_WORD in word_tree[new_letter]:
                        word = ''.join([board[index] for index in new_path])
                        score = calc_score(word, new_path, DW=dw, DL=dl, TW=tw, TL=tl)
                        if not word in found_words or found_words[word][1] < score:
                            found_words[word] = (new_path, score)
                    build_paths(graph=graph, path=new_path, word_tree=word_tree[new_letter])

    build_paths()

    # Convert dict to list of (word, path, score)
    word_tuples =[(word, vals[0], vals[1]) for word, vals in found_words.iteritems()]

    # Sort by score
    sorted_words = sorted(word_tuples, key=lambda x: x[2], reverse=True)

    # Calculate a running total of the score
    running_total = []
    for word, path, score in sorted_words:
        if running_total:
            running_total.append(running_total[-1] + score)
        else:
            running_total = [score]

    # Print results
    for i, (word, path, score) in enumerate(sorted_words):
        print '%s %s %s\t\t%s' % (running_total[i], score, word, path)
    print 'Total words:', len(sorted_words)
    print 'Sum (top 20):', running_total[19] if len(running_total) > 19 else running_total[-1]
    print 'Sum (top 50):', running_total[49] if len(running_total) > 49 else running_total[-1]


def option_parser(args=None):
    description = 'Calculate all possible words (and their score) for a game of scramble.'
    parser = ArgumentParser(description=description)

    parser.add_argument('board', type=str,
                        help='letters in the board', metavar='BOARD')
    parser.add_argument('-dw', '--double_word', type=int, dest='dw', default=[], action='append',
                        help='Location of double word score letters')
    parser.add_argument('-dl', '--double_letter', type=int, dest='dl', default=[], action='append',
                        help='Location of double letter score letters')
    parser.add_argument('-tw', '--tripple_word', type=int, dest='tw', default=[], action='append',
                        help='Location of tripple word score letters')
    parser.add_argument('-tl', '--tripple_letter', type=int, dest='tl', default=[], action='append',
                        help='Location of tripple letter score letters')
    parser.add_argument('-t', '--test', action='store_true', default=False,
                        help='Run tests instead of game')
    options = parser.parse_args(args)

    options.board = normalize_string(options.board)

    assert len(options.board) == 16, 'Board must be 16 characters long (a 4x4 grid).'

    return options


if __name__ == '__main__':
    options = option_parser()
    if options.test:
        import doctest
        doctest.testmod()
    else:
        play_scramble(options.board, dw=options.dw, dl=options.dl, tw=options.tw, tl=options.tl)
