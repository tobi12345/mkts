#!/usr/bin/env node
import * as yargs from 'yargs'
import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'

yargs.usage("mkts [name] [options...]")

yargs.option("git", {
	default: false,
	boolean: true
})

interface IProjectConfig {
	name: string
	destination: string
}

const initProjectDir = (name: string) => {

	const dirPath = path.join(process.cwd(), name)
	if (fs.existsSync(dirPath)) {
		console.error(`${dirPath} allready exists`)
		process.exit(1)
	}
	fs.mkdirSync(dirPath)

	return dirPath
}

const initPackageJson = ({ name, destination }: IProjectConfig) => {

	const packageJson = {
		"name": name,
		"version": "0.1.0",
		"main": "./dist/index.js",
		"scripts": {
			"watch": "tsc --watch",
			"build": "tsc",
			"start": "node ./dist/index.js",
			"prettify": "prettier --config .prettierrc.js --ignore-path .prettierignore --write ./src/**/*.{ts,tsx,js,jsx,json}"
		},
	}

	fs.writeFileSync(path.join(destination, "package.json"), JSON.stringify(packageJson, null, "\t"))
}

const installNpmPackage = (destination: string, isDev: boolean) => (name: string) => {

	const args = [
		"npm",
		"install",
		isDev ? "--save-dev" : "--save",
		name,
	]

	return new Promise((resolve, reject) => {
		exec(args.join(" "), {
			cwd: destination,
		}, (err) => {
			if (err) {
				console.error(`Error installing ${name}`)
				return reject(err)
			}

			resolve()
		})
	})
}

const initSrcDir = ({ destination }: IProjectConfig) => {

	const srcDir = path.join(destination, "src")
	fs.mkdirSync(srcDir)
	fs.writeFileSync(path.join(srcDir, "index.ts"), "console.log('hello world')")
}

const prettierConfig = ({ destination }: IProjectConfig) => {
	const config = {
		printWidth: 120,
		useTabs: true,
		tabWidth: 4,
		semi: false,
		singleQuote: false,
		trailingComma: 'all',
		bracketSpacing: true,
		jsxBracketSameLine: false,
		arrowParens: 'always',
	}

	fs.writeFileSync(path.join(destination, ".prettierrc.js"), `module.exports = ${JSON.stringify(config, null, "\t")}`)
}

const gitInit = ({ destination }: IProjectConfig) => {
	fs.writeFileSync(path.join(destination, ".gitignore"), `node_modules\ndist`)

	return new Promise((resolve, reject) => {
		exec("git init", {
			cwd: destination,
		}, (err) => {
			if (err) {
				console.error(`Error git init`)
				return reject(err)
			}

			resolve()
		})
	})
}

const tsConfig = ({ destination }: IProjectConfig) => {
	const config = {
		"compilerOptions": {
			"lib": [
				"esnext"
			],
			"target": "esnext",
			"module": "CommonJS",
			"moduleResolution": "node",
			"strict": true,
			"rootDir": "src",
			"outDir": "dist",
			"declaration": true,
		},
		"files": [
			"./src/index.ts"
		],
		"compileOnSave": true
	}

	fs.writeFileSync(path.join(destination, 'tsconfig.json'), JSON.stringify(config, null, "\t"))
}

(async () => {

	const name = yargs.argv._[0]

	if (!name) {
		yargs.showHelp()
		process.exit()
	}

	const destination = initProjectDir(name)

	const config: IProjectConfig = {
		name,
		destination
	}

	initPackageJson(config)

	const dependencies = ["typescript", ""]
	const devDependencies = ["prettier", "@types/node"]

	await Promise.all([
		...dependencies.map(installNpmPackage(destination, false)),
		...devDependencies.map(installNpmPackage(destination, true)),
	])

	initSrcDir(config)
	prettierConfig(config)
	fs.writeFileSync(path.join(destination, "README.md"), `# ${name}`)


	if (yargs.argv.git) {
		await gitInit(config)
	}
	tsConfig(config)

})().catch(console.error)