export const $style = {
    black: '#000000',
    white: '#ffffff',
    main: '#f36300',
    mainRGB: '243, 99, 0',
    secondary: '#be0100',
    special: '#fecd00'
}

export const PROBABILITY_UNIT_DIVISOR = 0.5;
export const PROBABILITY_MIN_MULTIPLIER = 1 / PROBABILITY_UNIT_DIVISOR; // ALERT !!! --> This is strictly correlated to probability

const ITEMS_MAP = [
    { id: 0, value: "lose", probability: 17.5 },
    { id: 1, value: "fake-win", probability: 22.5 },
    { id: 2, value: "win", probability: 52.5 },
    { id: 3, value: "mega-win", probability: 7.5 },
];

const getNormalizedItems = (items) => {
    return items.map((el) => {
        return { ...el, probability: el.probability * PROBABILITY_MIN_MULTIPLIER };
    });
};

export const $configs = {
    SCORE_PER_COIN: 100,
    USER: {
        SCORE: 0
    },
};
