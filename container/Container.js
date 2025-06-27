
export class Container {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }

    register(name, factory, singleton = true) {
        this.services.set(name, { factory, singleton });
        return this;
    }

    get(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service ${name} not found`);
        }

        if (service.singleton) {
            if (!this.singletons.has(name)) {
                this.singletons.set(name, service.factory(this));
            }
            return this.singletons.get(name);
        }

        return service.factory(this);
    }

    has(name) {
        return this.services.has(name);
    }
}
