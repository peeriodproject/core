// Type definitions for node-fake-fs
// Project: https://github.com/eldargab/node-fake-fs

/// <reference path='../node/node.d.ts' />

declare module "fake-fs" {

	interface Stats {
		isFile(): boolean;
		isDirectory(): boolean;
		isBlockDevice(): boolean;
		isCharacterDevice(): boolean;
		isSymbolicLink(): boolean;
		isFIFO(): boolean;
		isSocket(): boolean;
		dev: number;
		ino: number;
		mode: number;
		nlink: number;
		uid: number;
		gid: number;
		rdev: number;
		size: number;
		blksize: number;
		blocks: number;
		atime: Date;
		mtime: Date;
		ctime: Date;
	}

	interface DirectoryOptions {
		mtime?:number;
		atime?:number;
		ctime?:number;
	}

	export function dir(path: string, options?:DirectoryOptions);

	export function file(path: string);
	export function file(path: string, content?:string, encoding?:string);
	export function file(path: string, options?:any);

	export function patch():void;
	export function unpatch():void;

	export function bind():void;

	export function exists(path: string, callback?: (exists: boolean) => void): void;
	export function existsSync(path: string): boolean;

	export function stat(path: string, callback?: (err: NodeJS.ErrnoException, stats: Stats) => any): void;
	export function lstat(path: string, callback?: (err: NodeJS.ErrnoException, stats: Stats) => any): void;
	export function fstat(fd: number, callback?: (err: NodeJS.ErrnoException, stats: Stats) => any): void;
	export function statSync(path: string): Stats;
	export function lstatSync(path: string): Stats;
	export function fstatSync(fd: number): Stats;

	export function readdir(path: string, callback?: (err: NodeJS.ErrnoException, files: string[]) => void): void;
	export function readdirSync(path: string): string[];

	export function mkdir(path: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
	export function mkdir(path: string, mode: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
	export function mkdir(path: string, mode: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
	export function mkdirSync(path: string, mode?: number): void;
	export function mkdirSync(path: string, mode?: string): void;

	export function rmdir(path: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
	export function rmdirSync(path: string): void;

	export function unlink(path: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
	export function unlinkSync(path: string): void;

	export function readFile(filename: string, encoding: string, callback: (err: NodeJS.ErrnoException, data: string) => void): void;
	export function readFile(filename: string, options: { encoding: string; flag?: string; }, callback: (err: NodeJS.ErrnoException, data: string) => void): void;
	export function readFile(filename: string, options: { flag?: string; }, callback: (err: NodeJS.ErrnoException, data: Buffer) => void): void;
	export function readFile(filename: string, callback: (err: NodeJS.ErrnoException, data: Buffer) => void ): void;
	export function readFileSync(filename: string, encoding: string): string;
	export function readFileSync(filename: string, options: { encoding: string; flag?: string; }): string;
	export function readFileSync(filename: string, options?: { flag?: string; }): Buffer;

	export function writeFile(filename: string, data: any, callback?: (err: NodeJS.ErrnoException) => void): void;
	export function writeFile(filename: string, data: any, options: { encoding?: string; mode?: number; flag?: string; }, callback?: (err: NodeJS.ErrnoException) => void): void;
	export function writeFile(filename: string, data: any, options: { encoding?: string; mode?: string; flag?: string; }, callback?: (err: NodeJS.ErrnoException) => void): void;
	export function writeFileSync(filename: string, data: any, options?: { encoding?: string; mode?: number; flag?: string; }): void;
	export function writeFileSync(filename: string, data: any, options?: { encoding?: string; mode?: string; flag?: string; }): void;

	export function rename(oldPath: string, newPath: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
	export function renameSync(oldPath: string, newPath: string): void;
}