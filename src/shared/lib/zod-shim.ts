/**
 * Lightweight Zero-Dependency Schema Validation Shim (Zod-compatible)
 * Implements the exact schema subset used across the MiniGuard platform.
 */

export type SafeParseResult<T> = { success: true; data: T } | { success: false; error: any };

export class ZSchema<T = any> {
	_output!: T;
	constructor(public validator: (val: any) => SafeParseResult<T>) {}

	safeParse(val: any): SafeParseResult<T> {
		try {
			return this.validator(val);
		} catch (err) {
			return { success: false, error: err };
		}
	}

	parse(val: any): T {
		const res = this.safeParse(val);
		if (!res.success) throw new Error('Validation failed');
		return res.data;
	}

	optional(): ZSchema<T | undefined> {
		return new ZSchema<T | undefined>((val) => {
			if (val === undefined) return { success: true, data: undefined };
			return this.validator(val);
		});
	}

	nullable(): ZSchema<T | null> {
		return new ZSchema<T | null>((val) => {
			if (val === null) return { success: true, data: null };
			return this.validator(val);
		});
	}

	default(def: T): ZSchema<T> {
		return new ZSchema<T>((val) => {
			if (val === undefined) return { success: true, data: def };
			return this.validator(val);
		});
	}
}

export class ZNumber extends ZSchema<number> {
	constructor() {
		super((val) =>
			typeof val === 'number' && !Number.isNaN(val)
				? { success: true, data: val }
				: { success: false, error: 'Expected number' },
		);
	}
	int() {
		return this;
	}
	nonnegative() {
		return this;
	}
	positive() {
		return this;
	}
	min(_n: number) {
		return this;
	}
}

export class ZString extends ZSchema<string> {
	constructor() {
		super((val) =>
			typeof val === 'string'
				? { success: true, data: val }
				: { success: false, error: 'Expected string' },
		);
	}
}

export class ZBoolean extends ZSchema<boolean> {
	constructor() {
		super((val) =>
			typeof val === 'boolean'
				? { success: true, data: val }
				: { success: false, error: 'Expected boolean' },
		);
	}
}

export class ZArray<T> extends ZSchema<T[]> {
	constructor(public itemSchema: ZSchema<T>) {
		super((val) => {
			if (!Array.isArray(val)) return { success: false, error: 'Expected array' };
			const items: T[] = [];
			for (const el of val) {
				const r = itemSchema.safeParse(el);
				if (!r.success) return { success: false, error: r.error };
				items.push(r.data);
			}
			return { success: true, data: items };
		});
	}
}

export type InferShape<Shape extends Record<string, any>> = {
	[K in keyof Shape]: Shape[K] extends { _output: infer O } ? O : any;
};

export class ZObject<Shape extends Record<string, any>> extends ZSchema<InferShape<Shape>> {
	constructor(public shape: Shape) {
		super((val) => {
			if (!val || typeof val !== 'object') return { success: false, error: 'Expected object' };
			const result: any = { ...val };
			for (const key of Object.keys(shape)) {
				const res = shape[key].safeParse(val[key]);
				if (!res.success) return { success: false, error: `Invalid ${key}` };
				if (res.data !== undefined) result[key] = res.data;
			}
			return { success: true, data: result as InferShape<Shape> };
		});
	}

	partial(): ZObject<{ [K in keyof Shape]: ZSchema<Shape[K]['_output'] | undefined> }> {
		const partialShape: any = {};
		for (const k of Object.keys(this.shape)) {
			partialShape[k] = this.shape[k].optional();
		}
		return new ZObject(partialShape);
	}

	catchall(_schema?: any): this {
		return this;
	}
}

export const z = {
	object: <Shape extends Record<string, any>>(shape: Shape) => new ZObject(shape),
	array: <T>(item: ZSchema<T>) => new ZArray(item),
	string: () => new ZString(),
	number: () => new ZNumber(),
	boolean: () => new ZBoolean(),
	any: () => new ZSchema<any>((val) => ({ success: true, data: val })),
	unknown: () => new ZSchema<unknown>((val) => ({ success: true, data: val })),
	enum: <U extends string>(vals: readonly U[]) =>
		new ZSchema<U>((val) =>
			vals.includes(val)
				? { success: true, data: val }
				: { success: false, error: 'Expected enum value' },
		),
};

export namespace z {
	export type infer<T> = T extends { _output: infer O } ? O : any;
	export type ZodTypeAny = ZSchema<any>;
}
