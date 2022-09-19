import { MyPromise } from "./promise";

describe("Promise", () => {
    it("has a then method with resolve and reject callbacks", async done => {
        const _resolvingPromise = new MyPromise<string>((resolve, _reject) => {
            resolve("foo");
        }).then(result => {
            expect(result).toBe("foo");

            const _rejectingPromise = new MyPromise<string>((resolve, reject) => {
                reject(new Error("bar"));
            }).then(undefined, error => {
                expect(error.message).toBe("bar");
                done();
            });
        });
    });

    it("should not resolve an already rejected promise", async done => {
        const resolveCallback = jest.fn();
        const _rejectingPromise = new MyPromise<string>((resolve, reject) => {
            reject(new Error("bar"));
            resolve("foo");
        });
        _rejectingPromise.then(resolveCallback);
        _rejectingPromise.catch(error => {
            expect(error.message).toBe("bar");
            expect(resolveCallback).not.toHaveBeenCalled();
            done();
        });
    });

    it("should not reject an already resolved promise", async done => {
        const rejectCallback = jest.fn();
        const _resolvingPromise = new MyPromise<string>((resolve, reject) => {
            resolve("foo");
            reject(new Error("bar"));
        });
        _resolvingPromise.catch(rejectCallback);
        _resolvingPromise.then(result => {
            expect(result).toBe("foo");
            expect(rejectCallback).not.toHaveBeenCalled();
            done();
        });
    });

    it("has a catch method to attach a reject callback", async done => {
        const _rejectingPromise = new MyPromise<string>((resolve, reject) => {
            reject(new Error("bar"));
        }).catch(error => {
            expect(error.message).toBe("bar");
            done();
        });
    });

    it("has a finally method to attach an on complete callback", async done => {
        const _resolvingPromise = new MyPromise<string>((resolve, _reject) => {
            resolve("foo");
        }).finally(() => {
            done();
        });
    });

    it("can chain then catch methods", async done => {
        const _mypromise = new MyPromise<string>((resolve, _reject) => {
            resolve("foo");
        }).then(_result => {
            throw new Error("bar");
        }).catch(error => {
            throw new Error(`${error.message}bar`);
        }).catch(error => {
            return `${error.message}foo`;
        }).then(result => {
            expect(result).toBe("barbarfoo");
            done();
        });
    });
});

describe("MyPromise.all", () => {
    it("can combine promises into one", async done => {
        const promise1 = new MyPromise<string>((resolve, _reject) => {
            resolve("foo");
        });
        const promise2 = new MyPromise<string>((resolve, _reject) => {
            resolve("bar");
        });
        const promise3 = new MyPromise<string>((resolve, _reject) => {
            resolve("foo");
        });

        const combinedPromise = MyPromise.all([promise1, promise2, promise3]);

        combinedPromise.then(result => {
            expect(result).toStrictEqual(["foo", "bar", "foo"]);
            done();
        });
    });

    it("rejects the combined promise if an input promise is rejected", done => {
        const promise1 = new MyPromise<string>((resolve, _reject) => {
            resolve("foo");
        });
        const promise2 = new MyPromise<string>((_resolve, reject) => {
            reject(new Error("bar"));
        });
        const promise3 = new MyPromise<string>((resolve, _reject) => {
            resolve("foo");
        });

        const combinedPromise = MyPromise.all([promise1, promise2, promise3]);

        combinedPromise.catch(error => {
            expect(error.message).toBe("bar");
            done();
        });
    });
});

describe("MyPromise.allSettled", () => {
    it("should resolve with the statuses of the input promises", async done => {
        const promise1 = new MyPromise<string>((resolve, _reject) => {
            resolve("foo");
        });
        const promise2 = new MyPromise<string>((_resolve, reject) => {
            reject(new Error("bar"));
        });
        const promise3 = new MyPromise<string>((resolve, _reject) => {
            resolve("foo");
        });

        const combinedPromise = MyPromise.allSettled([promise1, promise2, promise3]);
        
        combinedPromise.then(statuses => {
            expect(statuses[0]).toStrictEqual({
                status: "fulfilled", 
                value: "foo"
            });

            expect(statuses[1]).toStrictEqual({
                status: "rejected",
                reason: Error("bar"),
            });

            expect(statuses[2]).toStrictEqual({
                status: "fulfilled",
                value: "foo"
            });

            done();
        });
    });
});
