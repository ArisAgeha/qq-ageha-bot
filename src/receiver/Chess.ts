import { App, observe, Meta, messages } from "koishi";
import { match } from "assert";

export class Chess {

    app: App;
    currentPlayer: number = null;
    playerRed: number = null;
    playerBlack: number = null;
    game: {
        chesses: { [key: string]: number[] };
        chessBoard: { [key: string]: string };
        history: Array<{ [key: string]: number[] }>;
        fallbackCheck: boolean;
    } = {
            chesses: {},
            chessBoard: {},
            history: [],
            fallbackCheck: false
        }

    initChessPosition = {
        '红车一': [1, 1],
        '红马一': [2, 1],
        '红象一': [3, 1],
        '红士一': [4, 1],
        '红将一': [5, 1],
        '红士二': [6, 1],
        '红象二': [7, 1],
        '红马二': [8, 1],
        '红车二': [9, 1],
        '红炮一': [2, 3],
        '红炮二': [8, 3],
        '红兵一': [1, 4],
        '红兵二': [3, 4],
        '红兵三': [5, 4],
        '红兵四': [7, 4],
        '红兵五': [9, 4],

        '黑车一': [1, 10],
        '黑马一': [2, 10],
        '黑象一': [3, 10],
        '黑士一': [4, 10],
        '黑将一': [5, 10],
        '黑士二': [6, 10],
        '黑象二': [7, 10],
        '黑马二': [8, 10],
        '黑车二': [9, 10],
        '黑炮一': [2, 8],
        '黑炮二': [8, 8],
        '黑兵一': [1, 7],
        '黑兵二': [3, 7],
        '黑兵三': [5, 7],
        '黑兵四': [7, 7],
        '黑兵五': [9, 7]
    }

    constructor(app: App) {
        this.app = app;
        this.initChesses();
        this.initReceiver();
    }

    initReceiver() {
        const app = this.app;

        this.app.group(435649543).receiver.on('message', (msg) => {
            const text = msg.rawMessage;

            if (text === '加入红方') this.joinRed(msg);
            else if (text === '加入黑方') this.joinBlack(msg);
            else if (text === '退出棋局' || text === '离开棋局') this.leave(msg);
            else if (text === '悔棋') this.fallbackStep(msg);
            else if (text === '同意' || text.toLowerCase() === 'y') this.agreeFallback(msg);
            else if (text === '拒绝' || text.toLowerCase() === 'n') this.refuseFallback(msg);
            else if (text === '弃权') this.abstained(msg);
            else if (/^[车|马|炮|将|兵|士|象]/.test(text)) this.moveChess(msg);
        })
    }

    moveChess(msg: Meta<'message'>) {
        if (!this.playerRed || !this.playerBlack) return;

        const text = msg.rawMessage;
        const sender = msg.sender.userId;

        if (sender !== this.currentPlayer) {
            msg.$send(`[CQ:at,qq=${sender}] 别急 还没轮到你`);
            return;
        }

        if (text.length !== 6) {
            msg.$send('指令有误，请输入【单位】+【编号】+【横纵坐标】');
            msg.$send('如：车二0209');
            return;
        }

        const camp = sender === this.playerRed ? '红' : '黑';
        const targetChess = camp + text.slice(0, 2);

        if (this.game.chesses[targetChess] === null) {
            msg.$send(`[CQ:at,qq=${sender}] ${text.slice(0, 2)} 已经没有买活了`);
            return;
        }
        else if (!this.game.chesses[targetChess]) {
            msg.$send(`[CQ:at,qq=${sender}] ${text.slice(0, 2)} 没有这个棋子`);
            return;
        }

        const targetPosition = this.generateArrayKeyFromStringKey(text.slice(2));

        const canMove = this.checkCanMove(targetChess, targetPosition);
        if (!canMove) {
            msg.$send(`[CQ:at,qq=${sender}]移动位置选择有误，请重新确认`);
            return;
        }

        this.game.history.push({ ...this.game.chesses });

        const targetPosKey = this.generateStringKeyFromArrayKey(targetPosition);
        const enemyChess = this.game.chessBoard[targetPosKey];
        if (enemyChess) this.game.chesses[enemyChess] = null;

        this.game.chesses[targetChess] = targetPosition;

        this.drawAndSendChessBoard(msg);
        this.checkGameStatus(msg);
    }

    checkGameStatus(msg: Meta<'message'>) {
        if (!this.game.chesses['红将一']) {
            msg.$send(`[CQ:at,qq=${this.playerBlack}]取得胜利！`);
            this.resetGame();
            return;
        }
        else if (!this.game.chesses['黑将一']) {
            msg.$send(`[CQ:at,qq=${this.playerRed}]取得胜利！`);
            this.resetGame();
            return;
        }
        else {
            this.currentPlayer = this.getAnotherPlayer(this.currentPlayer);
        }
    }

    checkCanMove(pickupChess: string, targetPos: number[]) {
        const camp = pickupChess[0];
        const targetType = pickupChess[1];
        const currentPos = this.game.chesses[pickupChess];
        const xDiff = targetPos[0] - currentPos[0];
        const yDiff = targetPos[1] - currentPos[1];

        console.log(targetPos);
        console.log(currentPos);
        // never move
        if (xDiff === 0 && yDiff === 0) return false;

        // out of range
        if (targetPos[0] < 1 || targetPos[0] > 9 || targetPos[1] < 1 || targetPos[1] > 10) return false;

        const targetPosKey = this.generateStringKeyFromArrayKey(targetPos);
        const targetChess = this.game.chessBoard[targetPosKey];
        if (targetChess) {
            const targetChessCamp = targetChess[0];
            if (camp === targetChessCamp) return false;
        }

        switch (targetType) {
            case '车':
                if (xDiff !== 0 && yDiff !== 0) {
                    console.log('1');
                    return false;
                }
                if (currentPos[0] === targetPos[0]) {
                    const max = Math.max(currentPos[1], targetPos[1]);
                    const min = Math.min(currentPos[1], targetPos[1]);

                    for (let i = min; i <= max; i++) {
                        const xCor = currentPos[0];
                        const yCor = i;
                        const position = [xCor, yCor];
                        const key = this.generateStringKeyFromArrayKey(position);

                        if (yCor === targetPos[1]) continue;
                        if (yCor === currentPos[1]) continue;
                        if (this.game.chessBoard[key]) {
                            console.log('2');
                            return false;
                        }
                    }
                }
                if (currentPos[1] === targetPos[1]) {
                    const max = Math.max(currentPos[0], targetPos[0]);
                    const min = Math.min(currentPos[0], targetPos[0]);

                    for (let i = min; i <= max; i++) {
                        const xCor = i;
                        const yCor = currentPos[1];
                        const position = [xCor, yCor];
                        const key = this.generateStringKeyFromArrayKey(position);

                        if (xCor === targetPos[0]) continue;
                        if (xCor === currentPos[0]) continue;
                        if (this.game.chessBoard[key]) {
                            console.log(3);
                            return false;
                        }
                    }
                }
                break;

            case '马':
                if (xDiff ** 2 + yDiff ** 2 !== 5) {
                    console.log(4)
                    return false;
                }
                if (Math.abs(yDiff) > Math.abs(xDiff)) {
                    const midPos = [currentPos[0], currentPos[1] + yDiff / 2];
                    const midKey = this.generateStringKeyFromArrayKey(midPos);
                    if (this.game.chessBoard[midKey]) {
                        console.log(5);
                        return false;
                    }
                }
                else if (Math.abs(yDiff) < Math.abs(xDiff)) {
                    const midPos = [currentPos[0] + xDiff / 2, currentPos[1]];
                    const midKey = this.generateStringKeyFromArrayKey(midPos);
                    if (this.game.chessBoard[midKey]) {
                        console.log(6);
                        return false;
                    }
                }
                break;

            case '炮':
                if (xDiff !== 0 && yDiff !== 0) {
                    console.log(7);
                    return false;
                }
                const targetPosKey = this.generateStringKeyFromArrayKey(targetPos);

                const targetPosHasUnit = !!this.game.chessBoard[targetPosKey];
                let midUnitCount = 0;

                if (currentPos[0] === targetPos[0]) {
                    const max = Math.max(currentPos[1], targetPos[1]);
                    const min = Math.min(currentPos[1], targetPos[1]);

                    for (let i = min; i <= max; i++) {
                        const xCor = currentPos[0];
                        const yCor = i;
                        const position = [xCor, yCor];
                        const key = this.generateStringKeyFromArrayKey(position);

                        if (yCor === currentPos[1] || yCor === targetPos[1]) continue;
                        if (this.game.chessBoard[key]) midUnitCount++;
                    }

                }
                else if (currentPos[1] === targetPos[1]) {
                    const max = Math.max(currentPos[0], targetPos[0]);
                    const min = Math.min(currentPos[0], targetPos[0]);

                    for (let i = min; i <= max; i++) {
                        const xCor = i;
                        const yCor = currentPos[1];
                        const position = [xCor, yCor];
                        const key = this.generateStringKeyFromArrayKey(position);

                        if (xCor === currentPos[0] || xCor === targetPos[0]) continue;
                        if (this.game.chessBoard[key]) midUnitCount++;
                    }
                }

                if (!((targetPosHasUnit && midUnitCount === 1) || (!targetPosHasUnit && midUnitCount === 0))) {
                    console.log(targetPosHasUnit && midUnitCount);
                    return false;
                }

                break;

            case '兵':
                if ((xDiff ** 2 + yDiff ** 2) !== 1) {
                    console.log(9)
                    return false;
                }
                if (camp === '红') {
                    if (currentPos[1] <= 5 && xDiff) {
                        console.log(10);
                        return false;
                    }
                    if (yDiff < 0) {
                        console.log(11);
                        return false;
                    }
                }
                else if (camp === '黑') {
                    if (currentPos[1] >= 6 && xDiff) {
                        console.log(12);
                        return false;
                    }
                    if (yDiff > 0) {
                        console.log(13);
                        return false;
                    }
                }
                break;

            case '将':
                if (xDiff ** 2 + yDiff ** 2 !== 1) return false;
                if (camp === '红') {
                    const targetPosKey = this.generateStringKeyFromArrayKey(targetPos);
                    const enemyKingPos = this.game.chesses['红将一'];
                    const enemyKingPosKey = this.generateStringKeyFromArrayKey(enemyKingPos);

                    if (targetPosKey === enemyKingPosKey) {
                        if (targetPos[1] !== currentPos[1]) {
                            console.log(14);
                            return false;
                        }

                        for (let i = currentPos[1] + 1; i < targetPos[1]; i++) {
                            const curPos = [currentPos[0], i];
                            const curPosKey = this.generateStringKeyFromArrayKey(curPos);
                            if (this.game.chessBoard[curPosKey]) {
                                console.log(15);
                                return false;
                            }
                        }
                    }
                    else if (!['0401', '0501', '0601', '0402', '0502', '0602', '0403', '0503', '0603'].includes(targetPosKey)) {
                        console.log(16);
                        return false;
                    }
                }
                else {
                    const targetPosKey = this.generateStringKeyFromArrayKey(targetPos);
                    const enemyKingPos = this.game.chesses['黑将一'];
                    const enemyKingPosKey = this.generateStringKeyFromArrayKey(enemyKingPos);

                    if (targetPosKey === enemyKingPosKey) {
                        if (targetPos[1] !== currentPos[1]) {
                            console.log(17);
                            return false;
                        }

                        for (let i = targetPos[1] + 1; i < currentPos[1]; i++) {
                            const curPos = [currentPos[0], i];
                            const curPosKey = this.generateStringKeyFromArrayKey(curPos);
                            if (this.game.chessBoard[curPosKey]) {
                                console.log(18);
                                return false;
                            }
                        }
                    }
                    else if (!(['0408', '0508', '0608', '0409', '0509', '0609', '0410', '0510', '0610'].includes(targetPosKey))) {
                        console.log(19);
                        return false;
                    }
                }
                break;

            case '象':
                if ((xDiff ** 2 + yDiff ** 2) !== 8) {
                    console.log(20);
                    return false;
                }

                if (camp === '红' && targetPos[1] > 5) {
                    console.log(21);
                    return false;
                }
                else if (camp === '黑' && targetPos[1] < 6) {
                    console.log(22);
                    return false;
                }

                const midPos = [currentPos[0] + xDiff / 2, currentPos[1] + yDiff / 2];
                const midPosKey = this.generateStringKeyFromArrayKey(midPos);
                if (this.game.chessBoard[midPosKey]) {
                    console.log(23);
                    return false;
                }

                break;

            case '士':
                if ((xDiff ** 2 + yDiff ** 2) !== 2) {
                    console.log(24);
                    return false;
                }
                if (camp === '红' && targetPos[1] > 3) {
                    console.log(25);
                    return false;
                }
                else if (camp === '黑' && targetPos[1] < 8) {
                    console.log(26);
                    return false;
                }

                break;
        }

        return true;
    }

    abstained(msg: Meta<'message'>) {
        const sender = msg.sender.userId;
        if (sender !== this.playerRed && sender !== this.playerBlack) return;
        if (!this.playerRed || !this.playerBlack) return;

        const anotherPlayer = this.getAnotherPlayer(sender);
        msg.$send(`[CQ:at,qq=${sender}]弃权，[CQ:at,qq=${anotherPlayer}]取得胜利！`);

        this.resetGame();
    }

    resetGame() {
        this.playerRed = null;
        this.playerBlack = null;
        this.currentPlayer = null;
        this.initChesses();
        this.clearHistory();
    }

    leave(msg: Meta<'message'>) {
        if (this.playerBlack && this.playerRed) {
            msg.$send('棋局已经开始，若要逃跑请用【弃权】命令');
            return;
        }
        const sender = msg.sender.userId;
        if (this.playerBlack === sender) {
            msg.$send('黑方进入了他的逃跑路线');
            this.playerBlack = null;
        }
        else if (this.playerRed === sender) {
            msg.$send('红方进入了他的逃跑路线');
            this.playerRed = null;
        }
        else {
            msg.$send('你是谁？');
        }
    }

    clearHistory() {
        this.game.history = [];
        this.game.fallbackCheck = false;
    }

    agreeFallback(msg: Meta<'message'>) {
        const sender = msg.sender.userId;
        if (sender === this.currentPlayer) {
            const lastStep = this.game.history.pop();
            this.game.chesses = { ...lastStep };
            this.game.fallbackCheck = false;
            this.syncChessBoard();
            this.observeChess();
            this.drawAndSendChessBoard(msg);
            this.currentPlayer = this.getAnotherPlayer(this.currentPlayer);
        }
    }

    refuseFallback(msg: Meta<'message'>) {
        const sender = msg.sender.userId;
        if (sender === this.currentPlayer) {
            const anotherPlayer = this.getAnotherPlayer(sender);
            this.game.fallbackCheck = false;
            msg.$send(`[CQ:at,qq=${anotherPlayer}]落地生根 怪自己眼瞎吧`)
        }
    }

    fallbackStep(msg: Meta<'message'>) {
        const sender = msg.sender.userId;

        if (!this.playerBlack || !this.playerRed) return;
        else if (this.game.history.length === 0) {
            msg.$send('还没下就开始反悔了？');
            return;
        }
        else if (this.currentPlayer === sender) {
            msg.$send('你要帮对面悔棋吗？');
            return;
        }
        this.game.fallbackCheck = true;

        const anotherPlayer = this.getAnotherPlayer(sender);

        msg.$send(`[CQ:at,qq=${anotherPlayer}]\r\n对方申请悔棋\r\n输入【同意】或【Y】同意悔棋\r\n输入【拒绝】或【N】拒绝悔棋`);
    }

    startGame(msg: Meta<'message'>) {
        this.currentPlayer = this.playerRed;
        this.drawAndSendChessBoard(msg);
        msg.$send(`对局开始 请红方先下子 [CQ:at,qq=${this.playerRed}]`);
    }

    joinBlack(msg: Meta<'message'>) {
        const sender = msg.sender.userId;
        if (this.playerBlack && this.playerRed) {
            msg.$send(`[CQ:at,qq=${sender}]比赛进行中`);
            return;
        }
        if (this.playerBlack) {
            msg.$send(`[CQ:at,qq=${sender}]黑方位置已经被占了`);
            return;
        }
        if ([this.playerRed, this.playerBlack].includes(msg.sender.userId)) {
            msg.$send(`[CQ:at,qq=${sender}]想要左右互搏？`);
            return;
        }

        this.playerBlack = msg.sender.userId;
        msg.$send(`[CQ:at,qq=${sender}]加入黑方成功`);
        if (this.playerBlack && this.playerRed) this.startGame(msg);
    }

    joinRed(msg: Meta<'message'>) {
        const sender = msg.sender.userId;

        if (this.playerBlack && this.playerRed) {
            msg.$send(`[CQ:at,qq=${sender}]比赛进行中`);
            return;
        }
        if (this.playerRed) {
            msg.$send(`[CQ:at,qq=${sender}]红方位置已经被占了`);
            return;
        }
        if ([this.playerRed, this.playerBlack].includes(msg.sender.userId)) {
            msg.$send(`[CQ:at,qq=${sender}]想要左右互搏？`);
            return;
        }
        this.playerRed = msg.sender.userId;
        msg.$send(`[CQ:at,qq=${sender}]加入红方成功`);
        if (this.playerBlack && this.playerRed) this.startGame(msg);
    }

    initChesses() {
        this.game.chesses = { ...this.initChessPosition };
        this.syncChessBoard();
        this.observeChess();
    }

    syncChessBoard() {
        const chessesReverseMaps = Object.fromEntries(
            Object.entries(this.game.chesses)
                .map(item => {
                    let key;
                    if (item[1] === null) key = null;
                    else key = this.getTwoDigit(item[1][0]) + this.getTwoDigit(item[1][1]);
                    const value = item[0];
                    return [key, value];
                })
                .filter(item => {
                    return item[0] !== null;
                })
        );

        const chessBoard: { [key: string]: string } = {};

        for (let x = 1; x < 10; x++) {
            for (let y = 1; y < 11; y++) {
                const key = this.generateStringKeyFromArrayKey([x, y]);
                const value = chessesReverseMaps[key] ? chessesReverseMaps[key] : null;
                chessBoard[key] = value;
            }
        }

        this.game.chessBoard = chessBoard;
    }

    observeChess() {
        const chesses = this.game.chesses;
        const keys = Object.keys(this.game.chesses);
        const _this = this;
        keys.forEach(key => {
            let val = chesses[key];

            Object.defineProperty(this.game.chesses, key, {
                set(newVal) {
                    val = newVal;
                    _this.syncChessBoard();
                },
                get() {
                    return val;
                }
            })
        })
    }

    getAnotherPlayer(player: number) {
        return this.playerRed === player ? this.playerBlack : this.playerRed;
    }

    drawAndSendChessBoard(msg: Meta<'message'>) {
        const zhMaps = '零一二三四五六七八九十';
        const chessBoard = this.game.chessBoard;
        const keys = Object.keys(chessBoard);

        const resArray = [];
        keys.forEach((key) => {
            const pos = this.generateArrayKeyFromStringKey(key);
            const value = chessBoard[key] ? chessBoard[key][1] : '十';
            const line = pos[1];
            const index = pos[0];
            if (!resArray[line]) resArray[line] = [zhMaps[line]];
            resArray[line][index] = value;
        });
        const res =
            '棋一二三四五六七八九\r\n' +
            resArray
                .reduce((prev, cur) => {
                    return prev.concat(cur).concat(['\r\n']);
                }, [])
                .filter(item => !!item)
                .reduce((prev, cur) => {
                    return prev + cur;
                })

        msg.$send(res);
    }

    private generateStringKeyFromArrayKey(arr: number[]) {
        const x = arr[0];
        const y = arr[1];

        const xCor = '0' + x.toString();
        const yCor = y >= 10 ? y.toString() : '0' + y.toString();

        return xCor + yCor;
    }

    private generateArrayKeyFromStringKey(str: string) {
        const x = Number(str.slice(0, 2));
        const y = Number(str.slice(2, 4));
        return [x, y];
    }

    private getTwoDigit(num: number): string {
        if (num >= 10) return num.toString();
        else if (num >= 0) return '0' + num.toString();
        else throw new Error('value could not be a negative number')
    }
}