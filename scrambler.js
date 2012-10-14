/*jshint smarttabs:true*/

/*
 * scrambler.js
 *
 * Author: Andrew Preston | preston.co.nz
 *
 * Finds all possible words in a scramble board.
 */

// The scramble letter values
//
// TODO: need to know the scores for J, K, V, X
var SCORES = {
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

// The scramble board is a 4x4 grid:
//
//     /-------------\
//     |  0  1  2  3 |
//     |  4  5  6  7 |
//     |  8  9 10 11 |
//     | 12 13 14 15 |
//     \-------------/
//
// The game can thus be represented by a graph: each point on the grid
// is a vertex and the edges are the adjacent points on the grid.
var GRAPH = {
    0: [1, 4, 5],
    1: [0, 2, 4, 5, 6],
    2: [1, 3, 5, 6, 7],
    3: [2, 6, 7],
    4: [0, 1, 5, 8, 9],
    5: [0, 1, 2, 4, 6, 8, 9, 10],
    6: [1, 2, 3, 5, 7, 9, 10, 11],
    7: [2, 3, 6, 10, 11],
    8: [4, 5, 9, 12, 13],
    9: [4, 5, 6, 8, 10, 12, 13, 14],
    10: [5, 6, 7, 9, 11, 13, 14, 15],
    11: [6, 7, 10, 14, 15],
    12: [8, 9, 13],
    13: [8, 9, 10, 12, 14],
    14: [9, 10, 11, 13, 15],
    15: [10, 11, 14],
}

function normalize_string(value) {
    value = value.replace(/[,\s]/g, "");
    value = value.toUpperCase();
    return value;
}

var WORD_FILE = "TWL06.txt"
var IS_WORD = 1
var WORD_COUNT = 0
var WORD_TREE = {}

function load_dictionary(word_list) {
    var word_tree = {}

    $(word_list).each(function(i) {
        WORD_COUNT += 1;
        var letters = normalize_string(word_list[i]).split("");
        var leaf = word_tree;

        $(letters).each(function(j) {
            var letter = letters[j];
            if (!leaf[letter]) {
                leaf[letter] = {};
            }
            leaf = leaf[letter];
        });
        leaf[IS_WORD] = true;
    });

    return word_tree;
}

function init_dictionary() {
    $.ajax({
        type: "GET",
        url: WORD_FILE,
        dataType: "text",
        success: function(data) {
            var words = data.split("\n");
            WORD_TREE = load_dictionary(words);
            console.log("Loaded dictionary with ", WORD_COUNT, " words");
        }
    });
}


function calc_score(word, path, bonus_squares) {//dw, dl, tw, tl) {

    var defaults = {
        "dw": [],
        "dl": [],
        "tw": [],
        "tl": []
    };

    var bonus_squares = $.extend({}, defaults, bonus_squares);

    var word_len = word.length;
    var word_score = 0;
    var word_multiplier = 1;

    word = word.replace("QU", "Q");
    var letters = word.split("");

    $(letters).each(function(i) {
        var letter_multiplier = 1;
        var letter = letters[i];
        var index = path[i];
        var letter_score = SCORES[letter];
        letter_multiplier *= bonus_squares["dl"].indexOf(index) != -1 ? 2 : 1;
        letter_multiplier *= bonus_squares["tl"].indexOf(index) != -1 ? 3 : 1;
        word_multiplier   *= bonus_squares["dw"].indexOf(index) != -1 ? 2 : 1;
        word_multiplier   *= bonus_squares["tw"].indexOf(index) != -1 ? 3 : 1;
        word_score += letter_multiplier * letter_score
    });

    switch(word_len) {
    case 10: length_bonus = 28; break;
    case  9: length_bonus = 20; break;
    case  8: length_bonus = 15; break;
    case  7: length_bonus = 10; break;
    case  6: length_bonus =  6; break;
    case  5: length_bonus =  3; break;
    default: length_bonus =  0;
    }

    return word_multiplier * word_score + length_bonus;
}

function build_word(path, board) {
    var letters = "";
    $(path).each(function(i) {
        letters += board[path[i]];
    });
    return letters;//''.join(letters);
}

function scramble(board, bonus_squares) {
    board = normalize_string(board);
    console.log("Scrambling", board);

    // map WORD => word_score
    found_words = {};

    function build_paths(graph, path, word_tree) {

        var node, new_paths, adjacent_nodes;

        if (path.length > 0) {
            node = path[path.length-1];
            adjacent_nodes = graph[node];
        } else {
            new_paths = [];
            adjacent_nodes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        }


        $(adjacent_nodes).each(function(i) {
            var adjacent_node = adjacent_nodes[i];

            if (path.indexOf(adjacent_node) == -1) {
                var new_path = path.slice(0); // copy
                new_path.push(adjacent_node); // append

                var new_letter = board[adjacent_node];

                if (word_tree[new_letter]) {
                    if (word_tree[new_letter][IS_WORD]) {
                        var word = build_word(new_path, board);
                        var score = calc_score(word, new_path, bonus_squares);
                        found_words[word] = score;
                    }
                    build_paths(graph, new_path, word_tree[new_letter]);
                }
            }
        });
    }

    build_paths(GRAPH, [], WORD_TREE);

    console.log("Found ", Object.keys(found_words).length, " words");
    return found_words;
}