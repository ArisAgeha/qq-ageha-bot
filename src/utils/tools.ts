export async function sleep(time) {
    return new Promise((res) => {
        setTimeout(() => {
            res();
        }, time)
    })
}

export class TextHelper {
    text = '';

    constructor(str?: string) {
        this.text = str || '';
    }

    append(str: string) {
        if (this.text) this.text += `\r\n${str}`;
        else this.text += str;
    }

    getText() {
        return this.text;
    }
}