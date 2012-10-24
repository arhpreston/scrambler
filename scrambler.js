/*jshint smarttabs:true*/

/*
 * scrambler.js
 *
 * Author: Andrew Preston | preston.co.nz
 *
 * Finds all possible words in a scramble board.
 *
 * Requires:
 *     jQuery (to load dictionary, and for some iteration)
 *
 * Usage:
 *     scrambler.SCORES
 *         => assiciative array of letters to letter score
 *     scrambler.initDictionary(dictionaryUrl, callback)
 *     scrambler.scramble(board, bonusSquares)
 *         => returns associative array of found words
 */


;(function(scrambler) {
    "use strict";

    // The scramble letter values
    //
    // TODO: need to know the scores for J, K, V, X
    scrambler.SCORES = {
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
    };

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
        15: [10, 11, 14]
    };

    scrambler.normalizeString = function(value) {
        if (value instanceof Array) return value;
        value = value.replace(/[,\s]/g, "");
        value = value.toUpperCase();
        return value;
    }

    var IS_WORD = 1;
    var WORD_COUNT = 0;
    var WORD_TREE = {};

    function loadDictionary(words) {
        var wordTree = {};

        $(words).each(function(i) {
            WORD_COUNT += 1;
            var letters = scrambler.normalizeString(words[i]).split("");
            var leaf = wordTree;

            $(letters).each(function(j) {
                var letter = letters[j];
                if (!leaf[letter]) {
                    leaf[letter] = {};
                }
                leaf = leaf[letter];
            });
            leaf[IS_WORD] = true;
        });

        return wordTree;
    }

    scrambler.initDictionary = function(dictionaryUrl, callback) {
        $.ajax({
            type: "GET",
            url: dictionaryUrl,
            dataType: "text",
            success: function(data) {
                var words = data.split("\n");
                WORD_TREE = loadDictionary(words);
                console.log("Loaded dictionary with ", WORD_COUNT, " words");
                if (callback) callback(WORD_COUNT, WORD_TREE);
            },
        });
    }

    function calcScore(word, path, bonusSquares) {

        var defaults = {
            "dw": [],
            "dl": [],
            "tw": [],
            "tl": []
        };

        bonusSquares = $.extend({}, defaults, bonusSquares);

        var wordLen = word.length;
        var wordScore = 0;
        var lengthBonus = 0;
        var wordMultiplier = 1;

        word = word.replace("QU", "Q");
        var letters = word.split("");

        $(letters).each(function(i) {
            var letterMultiplier = 1;
            var letter = letters[i];
            var index = path[i];
            var letterScore = scrambler.SCORES[letter];
            letterMultiplier *= bonusSquares.dl.indexOf(index) !== -1 ? 2 : 1;
            letterMultiplier *= bonusSquares.tl.indexOf(index) !== -1 ? 3 : 1;
            wordMultiplier   *= bonusSquares.dw.indexOf(index) !== -1 ? 2 : 1;
            wordMultiplier   *= bonusSquares.tw.indexOf(index) !== -1 ? 3 : 1;
            wordScore += letterMultiplier * letterScore;
        });

        switch(wordLen) {
        case 10: lengthBonus = 28; break;
        case  9: lengthBonus = 20; break;
        case  8: lengthBonus = 15; break;
        case  7: lengthBonus = 10; break;
        case  6: lengthBonus =  6; break;
        case  5: lengthBonus =  3; break;
        }

        return wordMultiplier * wordScore + lengthBonus;
    }

    function buildWord(path, board) {
        var letters = "";
        $(path).each(function(i) {
            letters += board[path[i]];
        });
        return letters;
    }

    scrambler.scramble = function(board, bonusSquares) {
        board = scrambler.normalizeString(board);
        console.log("Scrambling", board);

        // map WORD => wordScore, wordPath
        var foundWords = {};

        function buildPaths(graph, path, wordTree) {

            var node, newPaths, adjacentNodes;

            if (path.length > 0) {
                node = path[path.length-1];
                adjacentNodes = graph[node];
            } else {
                newPaths = [];
                adjacentNodes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
            }


            $(adjacentNodes).each(function(i) {
                var adjacentNode = adjacentNodes[i];

                if (path.indexOf(adjacentNode) == -1) {
                    var newPath = path.slice(0); // copy
                    newPath.push(adjacentNode);  // append

                    var newLetter = board[adjacentNode];

                    if (wordTree[newLetter]) {
                        if (wordTree[newLetter][IS_WORD]) {
                            var word = buildWord(newPath, board);
                            var score = calcScore(word, newPath, bonusSquares);
                            foundWords[word] = {"score": score, "path": newPath};
                        }
                        buildPaths(graph, newPath, wordTree[newLetter]);
                    }
                }
            });
        }

        buildPaths(GRAPH, [], WORD_TREE);

        console.log("Found ", Object.keys(foundWords).length, " words");
        return foundWords;
    }
})(window.scrambler = window.scrambler || {});