


const CACHE_COLORS: { [email: string]: string } = {};

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function getRandomUser() {
    const initial = getRandomTwoLetterInitial();

    return { initial, color: getColor(initial) };
}

export function getRandomTwoLetterInitial(): string {
    let randomInitial = '';

    for (let i = 0; i < 2; i++) {
        const randomIndex = Math.floor(Math.random() * alphabet.length);

        randomInitial += alphabet.charAt(randomIndex);
    }

    return randomInitial;
}

export function getColor(name: string) {
    let color = CACHE_COLORS[name];

    if (!color) {
        const colorHash = hashCode(name);
        const colorValue = Color.fromHsv(toPositiveDegree(colorHash), 0.6, 0.7);

        color = colorValue.toString();

        CACHE_COLORS[name] = color;
    }

    return color;
}

export class Color {
    constructor(
        public readonly r: number,
        public readonly g: number,
        public readonly b: number
    ) {
    }

    public toString(): string {
        let r = Math.round(this.r * 255).toString(16);
        let g = Math.round(this.g * 255).toString(16);
        let b = Math.round(this.b * 255).toString(16);

        if (r.length === 1) {
            r = '0' + r;
        }
        if (g.length === 1) {
            g = '0' + g;
        }
        if (b.length === 1) {
            b = '0' + b;
        }

        return '#' + r + g + b;
    }

    public static fromHsv(h: number, s: number, v: number): Color {
        const hi = Math.floor(h / 60) % 6;

        const f = (h / 60) - Math.floor(h / 60);

        const p = (v * (1 - s));
        const q = (v * (1 - (f * s)));
        const t = (v * (1 - ((1 - f) * s)));

        switch (hi) {
            case 0:
                return new Color(v, t, p);
            case 1:
                return new Color(q, v, p);
            case 2:
                return new Color(p, v, t);
            case 3:
                return new Color(p, q, v);
            case 4:
                return new Color(t, p, v);
            default:
                return new Color(v, p, q);
        }
    }
}

function toPositiveDegree(degree: number): number {
    degree %= 360;

    while (degree < 0) {
        degree += 360;
    }

    while (degree >= 360) {
        degree -= 360;
    }

    return degree;
}

function hashCode(value: string) {
    let hash = 0;

    if (!value || value.length === 0) {
        return hash;
    }

    for (let i = 0; i < value.length; i++) {
        const char = value.charCodeAt(i);

        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }

    return hash;
}