"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Queue_head, _Queue_tail, _Queue_size;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = pLimit;
function pLimit(concurrency) {
    validateConcurrency(concurrency);
    const queue = new Queue();
    let activeCount = 0;
    const resumeNext = () => {
        if (activeCount < concurrency && queue.size > 0) {
            queue.dequeue()();
            // Since `pendingCount` has been decreased by one, increase `activeCount` by one.
            activeCount++;
        }
    };
    const next = () => {
        activeCount--;
        resumeNext();
    };
    const run = async (function_, resolve, arguments_) => {
        const result = (async () => function_(...arguments_))();
        resolve(result);
        try {
            await result;
        }
        catch { }
        next();
    };
    const enqueue = (function_, resolve, arguments_) => {
        // Queue `internalResolve` instead of the `run` function
        // to preserve asynchronous context.
        new Promise(internalResolve => {
            queue.enqueue(internalResolve);
        }).then(run.bind(undefined, function_, resolve, arguments_));
        (async () => {
            // This function needs to wait until the next microtask before comparing
            // `activeCount` to `concurrency`, because `activeCount` is updated asynchronously
            // after the `internalResolve` function is dequeued and called. The comparison in the if-statement
            // needs to happen asynchronously as well to get an up-to-date value for `activeCount`.
            await Promise.resolve();
            if (activeCount < concurrency) {
                resumeNext();
            }
        })();
    };
    const generator = (function_, ...arguments_) => new Promise(resolve => {
        enqueue(function_, resolve, arguments_);
    });
    Object.defineProperties(generator, {
        activeCount: {
            get: () => activeCount,
        },
        pendingCount: {
            get: () => queue.size,
        },
        clearQueue: {
            value() {
                queue.clear();
            },
        },
        concurrency: {
            get: () => concurrency,
            set(newConcurrency) {
                validateConcurrency(newConcurrency);
                concurrency = newConcurrency;
                queueMicrotask(() => {
                    // eslint-disable-next-line no-unmodified-loop-condition
                    while (activeCount < concurrency && queue.size > 0) {
                        resumeNext();
                    }
                });
            },
        },
    });
    return generator;
}
function validateConcurrency(concurrency) {
    if (!((Number.isInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency > 0)) {
        throw new TypeError('Expected `concurrency` to be a number from 1 and up');
    }
}
class Node {
    constructor(value) {
        this.value = value;
    }
}
class Queue {
    constructor() {
        _Queue_head.set(this, void 0);
        _Queue_tail.set(this, void 0);
        _Queue_size.set(this, void 0);
        this.clear();
    }
    enqueue(value) {
        var _a;
        const node = new Node(value);
        if (__classPrivateFieldGet(this, _Queue_head, "f")) {
            __classPrivateFieldGet(this, _Queue_tail, "f").next = node;
            __classPrivateFieldSet(this, _Queue_tail, node, "f");
        }
        else {
            __classPrivateFieldSet(this, _Queue_head, node, "f");
            __classPrivateFieldSet(this, _Queue_tail, node, "f");
        }
        __classPrivateFieldSet(this, _Queue_size, (_a = __classPrivateFieldGet(this, _Queue_size, "f"), _a++, _a), "f");
    }
    dequeue() {
        var _a;
        const current = __classPrivateFieldGet(this, _Queue_head, "f");
        if (!current) {
            return;
        }
        __classPrivateFieldSet(this, _Queue_head, __classPrivateFieldGet(this, _Queue_head, "f").next, "f");
        __classPrivateFieldSet(this, _Queue_size, (_a = __classPrivateFieldGet(this, _Queue_size, "f"), _a--, _a), "f");
        return current.value;
    }
    peek() {
        if (!__classPrivateFieldGet(this, _Queue_head, "f")) {
            return;
        }
        return __classPrivateFieldGet(this, _Queue_head, "f").value;
        // TODO: Node.js 18.
        // return this.#head?.value;
    }
    clear() {
        __classPrivateFieldSet(this, _Queue_head, undefined, "f");
        __classPrivateFieldSet(this, _Queue_tail, undefined, "f");
        __classPrivateFieldSet(this, _Queue_size, 0, "f");
    }
    get size() {
        return __classPrivateFieldGet(this, _Queue_size, "f");
    }
    *[(_Queue_head = new WeakMap(), _Queue_tail = new WeakMap(), _Queue_size = new WeakMap(), Symbol.iterator)]() {
        let current = __classPrivateFieldGet(this, _Queue_head, "f");
        while (current) {
            yield current.value;
            current = current.next;
        }
    }
}
//# sourceMappingURL=plimit.js.map