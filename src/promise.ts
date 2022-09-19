
import queueMicrotask from 'queue-microtask';

type ResolveCallbackType<T> = (result: T | void) => void | T;
type RejectCallbackType<T> = (error: Error) => void | T;
type onCompleteCallbackType = () => void;
type PayloadFunctionType<T> = 
    (resolve: ResolveCallbackType<T>, reject: RejectCallbackType<T>) => void;

type AllSettledStatus<T> = {
    status: "fulfilled" | "rejected",
    value?: T | void,
    reason?: Error,
}

enum PromiseState {
    PENDING,
    RESOLVED,
    REJECTED,
}

export class AggregateError extends Error {
    errors: Error[];

    constructor(errors: Error[]) {
        super("All Promises rejected");
        this.errors = errors;
    }
}

export class MyPromise<T> {
    private resolvedResult: T;
    private error: Error;
    private promiseState = PromiseState.PENDING;

    private resolveCallback: ResolveCallbackType<T>;
    private rejectCallback: RejectCallbackType<T>;
    private onCompleteCallback: onCompleteCallbackType;

    constructor(functionToCall: PayloadFunctionType<T>) {
        queueMicrotask(() => {
            try {
                functionToCall(this.onResolve.bind(this), this.onReject.bind(this));
            } catch(e) {
                this.onReject(e);
            }
        });
    }

    private onResolve(result: T) {
        if (this.promiseState !== PromiseState.PENDING) return;

        this.resolvedResult = result;
        this.promiseState = PromiseState.RESOLVED;

        this.runCallbacks();
    }

    private onReject(error: Error) {
        if (this.promiseState !== PromiseState.PENDING) return;

        this.error = error;
        this.promiseState = PromiseState.REJECTED;

        this.runCallbacks();
    }

    private runCallbacks() {
        if (this.promiseState === PromiseState.RESOLVED && this.resolveCallback) {
            this.resolveCallback(this.resolvedResult);
        }

        if (this.promiseState === PromiseState.REJECTED && this.rejectCallback) {
            this.rejectCallback(this.error);
        }

        if (this.promiseState !== PromiseState.PENDING && this.onCompleteCallback) {
            this.onCompleteCallback();
        }
    }

    then(resolveCb?: ResolveCallbackType<T>, rejectCb?: RejectCallbackType<T>) {
        return new MyPromise<T>((resolve, reject) => {
            this.resolveCallback = result => {
                if(!resolveCb) {
                    resolve(result);
                    return;
                }

                try {
                    resolve(resolveCb(result));
                } catch(error) {
                    reject(error);
                }
            };

            this.rejectCallback = error => {
                if(!rejectCb) {
                    reject(error);
                    return;
                }

                try {
                    resolve(rejectCb(error));
                } catch(error) {
                    reject(error);
                }
            };

            this.runCallbacks();
        });
    }

    catch(reject: RejectCallbackType<T>) {
        return this.then(undefined, reject);
    }

    finally(onCompleteCallback: onCompleteCallbackType) {
        this.onCompleteCallback = onCompleteCallback;

        this.runCallbacks();
    }

    static all<T>(myPromises: readonly MyPromise<T>[]) {
        const results = [];

        return new MyPromise<T[]>((resolve, reject) => {
            for(const promise of myPromises) {
                promise.then(result => {
                    results.push(result);
                    if (results.length === myPromises.length) {
                        resolve(results);
                    }
                }).catch(error => {
                    reject(error);
                });
            }
        });
    }

    static allSettled<T>(myPromises: readonly MyPromise<T>[]) {
        const statuses: AllSettledStatus<T>[] = [];

        return new MyPromise<AllSettledStatus<T>[]>(resolve => {
            for(const promise of myPromises) {
                promise.then(result => {
                    statuses.push({
                        status: "fulfilled",
                        value: result,
                    });

                    if(statuses.length === myPromises.length) {
                        resolve(statuses);
                    }
                });
                
                promise.catch(error => {
                    statuses.push({
                        status: "rejected",
                        reason: error,
                    });

                    if(statuses.length === myPromises.length) {
                        resolve(statuses);
                    }
                });
            }
        });
    }

    static any<T>(myPromises: readonly MyPromise<T>[]) {
        const errors: Error[] = [];

        return new MyPromise<T>((resolve, reject) => {
            for(const promise of myPromises) {
                promise.then(result => {
                    resolve(result);
                });

                promise.catch(error => {
                    errors.push(error);

                    if(errors.length === myPromises.length) {
                        reject(new AggregateError(errors));
                    }
                });
            }
        });
    }
}