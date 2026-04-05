/**
 * Pseudo-English word generator for SnakeMan.
 *
 * Builds syllables from the eaten-letter bank using basic phonotactic
 * rules (onset + nucleus + optional coda).  If the bank lacks vowels or
 * consonants, falls back to random sampling.
 */
(function (DM) {
  const { state } = DM;

  const VOWELS = new Set("aeiou".split(""));
  const CONSONANTS = new Set("bcdfghjklmnpqrstvwxyz".split(""));

  const ONSETS = [
    "", "b", "bl", "br", "c", "ch", "cl", "cr", "d", "dr",
    "f", "fl", "fr", "g", "gl", "gr", "h", "j", "k", "kn",
    "l", "m", "n", "p", "pl", "pr", "qu", "r", "s", "sc",
    "sh", "sk", "sl", "sm", "sn", "sp", "spr", "st", "str",
    "sw", "t", "th", "tr", "v", "w", "wr", "z"
  ];

  const CODAS = [
    "", "b", "ck", "d", "f", "ft", "g", "k", "l", "ld",
    "lk", "lp", "lt", "m", "mp", "n", "nd", "ng", "nk",
    "nt", "p", "r", "rd", "rk", "rm", "rn", "rp", "rs",
    "rt", "s", "sh", "sk", "sp", "ss", "st", "t", "th",
    "x", "z"
  ];

  const NUCLEI = ["a", "e", "i", "o", "u", "ai", "au", "ea", "ee", "oa", "oo", "ou"];

  const SPIT_DISPLAY_MS = 2200;
  const SPIT_COOLDOWN_MS = 600;
  let lastSpitMs = 0;

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function countAvailable(bank) {
    const counts = {};
    for (const ch of bank) {
      const lower = ch.toLowerCase();
      counts[lower] = (counts[lower] || 0) + 1;
    }
    return counts;
  }

  /**
   * Try to "spend" each character of `str` from the counts map.
   * Returns true if all characters were available.
   */
  function canSpend(str, counts) {
    const needed = {};
    for (const ch of str) {
      needed[ch] = (needed[ch] || 0) + 1;
      if ((counts[ch] || 0) < needed[ch]) return false;
    }
    return true;
  }

  function spend(str, counts) {
    for (const ch of str) {
      counts[ch]--;
    }
  }

  function makeSyllable(counts, isLast) {
    const available = Object.entries(counts).filter(([, n]) => n > 0);
    if (!available.length) return null;

    const hasVowel = available.some(([ch]) => VOWELS.has(ch));
    const hasCons = available.some(([ch]) => CONSONANTS.has(ch));

    if (!hasVowel) {
      const ch = pick(available)[0];
      counts[ch]--;
      return ch;
    }

    let onset = "";
    if (hasCons) {
      const shuffled = [...ONSETS].sort(() => Math.random() - 0.5);
      for (const o of shuffled) {
        if (o === "") { onset = ""; break; }
        if (canSpend(o, counts)) { onset = o; break; }
      }
    }

    const shuffledNuclei = [...NUCLEI].sort(() => Math.random() - 0.5);
    let nucleus = null;
    for (const n of shuffledNuclei) {
      if (canSpend(n, counts)) { nucleus = n; break; }
    }
    if (!nucleus) {
      const vowelChars = available.filter(([ch]) => VOWELS.has(ch));
      if (!vowelChars.length) return null;
      nucleus = pick(vowelChars)[0];
    }

    let coda = "";
    if (isLast || Math.random() < 0.45) {
      if (hasCons) {
        const shuffledCodas = [...CODAS].sort(() => Math.random() - 0.5);
        for (const c of shuffledCodas) {
          if (c === "") { coda = ""; break; }
          const tempCounts = { ...counts };
          spend(onset, tempCounts);
          spend(nucleus, tempCounts);
          if (canSpend(c, tempCounts)) { coda = c; break; }
        }
      }
    }

    const syl = onset + nucleus + coda;

    const testCounts = { ...counts };
    if (!canSpend(syl, testCounts)) {
      const fallbackVowels = available.filter(([ch]) => VOWELS.has(ch));
      if (fallbackVowels.length) {
        const ch = pick(fallbackVowels)[0];
        counts[ch]--;
        return ch;
      }
      return null;
    }

    spend(syl, counts);
    return syl;
  }

  function generateWord(bank) {
    if (!bank || !bank.length) return null;

    const letters = bank.filter((ch) => /[a-zA-Z]/.test(ch));
    if (letters.length < 2) return null;

    const counts = countAvailable(letters);
    const syllableCount = 1 + Math.floor(Math.random() * 3);
    let word = "";

    for (let i = 0; i < syllableCount; i++) {
      const syl = makeSyllable(counts, i === syllableCount - 1);
      if (!syl) break;
      word += syl;
    }

    if (word.length < 2) {
      const pool = letters.map((c) => c.toLowerCase());
      const len = 2 + Math.floor(Math.random() * 5);
      word = "";
      for (let i = 0; i < len && i < pool.length; i++) {
        word += pick(pool);
      }
    }

    return word;
  }

  function removeLettersFromBank(word, bank) {
    for (const ch of word) {
      const idx = bank.findIndex((b) => b.toLowerCase() === ch.toLowerCase());
      if (idx !== -1) bank.splice(idx, 1);
    }
  }

  DM.snakeSpit = {
    canSpit() {
      if (state.physics.physicsMode !== "snake") return false;
      if (!state.snake.alive) return false;
      const bank = state.snake.eatenBank;
      if (!bank || bank.length < 2) return false;
      return performance.now() - lastSpitMs >= SPIT_COOLDOWN_MS;
    },

    spit() {
      if (!DM.snakeSpit.canSpit()) return null;

      const word = generateWord(state.snake.eatenBank);
      if (!word) return null;

      removeLettersFromBank(word, state.snake.eatenBank);

      lastSpitMs = performance.now();
      state.snake.spitMessage = word;
      state.snake.spitAtMs = performance.now();

      state.snake.wordsCreated++;
      state.snake.wordsList.push(word);
      if (state.snake.wordsList.length > 500) {
        state.snake.wordsList = state.snake.wordsList.slice(-500);
      }

      DM.bridge.logSpitWord(word, word.split(""));
      return word;
    },

    isShowing() {
      if (!state.snake.spitMessage) return false;
      return performance.now() - state.snake.spitAtMs < SPIT_DISPLAY_MS;
    },

    currentMessage() {
      if (!DM.snakeSpit.isShowing()) {
        state.snake.spitMessage = null;
        return null;
      }
      return state.snake.spitMessage;
    },

    displayProgress() {
      if (!state.snake.spitAtMs) return 0;
      return Math.min(1, (performance.now() - state.snake.spitAtMs) / SPIT_DISPLAY_MS);
    }
  };
})(globalThis.DataMan);
