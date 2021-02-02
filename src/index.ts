#!/usr/bin/env node
import * as yargs from "yargs"
import * as fs from "fs"
import * as path from "path"
import { exec } from "child_process"

yargs.usage("mkts [name] [options...]")

yargs.option("git", {
	default: false,
	boolean: true,
})

yargs.option("cc", {
	default: false,
	boolean: true,
	description: "init coding challenge template",
})

interface IProjectConfig {
	name: string
	destination: string
}

const initProjectDir = (name: string) => {
	const dirPath = path.join(process.cwd(), name)
	if (fs.existsSync(dirPath)) {
		console.error(`${dirPath} allready exists`)
		process.exit(0)
	}
	fs.mkdirSync(dirPath)

	return dirPath
}

const initPackageJson = ({ name, destination }: IProjectConfig) => {
	const packageJson = {
		name: name,
		version: "0.1.0",
		main: "./dist/index.js",
		scripts: {
			watch: "tsc --watch",
			build: "tsc",
			start: "node ./dist/index.js",
			prettify:
				"prettier --config .prettierrc.js --ignore-path .prettierignore --write ./src/**/*.{ts,tsx,js,jsx,json}",
		},
	}

	fs.writeFileSync(path.join(destination, "package.json"), JSON.stringify(packageJson, null, "\t"))
}

const installNpmPackage = (destination: string, isDev: boolean = false) => (name: string) => {
	const args = ["npm", "install", isDev ? "--save-dev" : "--save", name]

	return new Promise<void>((resolve, reject) => {
		exec(
			args.join(" "),
			{
				cwd: destination,
			},
			(err) => {
				if (err) {
					console.error(`Error installing ${name}`)
					return reject(err)
				}
				resolve()
			},
		)
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
		trailingComma: "all",
		bracketSpacing: true,
		jsxBracketSameLine: false,
		arrowParens: "always",
	}

	fs.writeFileSync(path.join(destination, ".prettierrc.js"), `module.exports = ${JSON.stringify(config, null, "\t")}`)
}

const gitInit = ({ destination }: IProjectConfig) => {
	fs.writeFileSync(path.join(destination, ".gitignore"), `node_modules\ndist`)

	return new Promise<void>((resolve, reject) => {
		exec(
			"git init",
			{
				cwd: destination,
			},
			(err) => {
				if (err) {
					console.error(`Error git init`)
					return reject(err)
				}

				resolve()
			},
		)
	})
}

const tsConfig = ({ destination }: IProjectConfig) => {
	const config = {
		compilerOptions: {
			lib: ["esnext"],
			target: "esnext",
			module: "CommonJS",
			moduleResolution: "node",
			strict: true,
			rootDir: "src",
			outDir: "dist",
			declaration: true,
			sourceMap: true,
		},
		include: ["./src"],
		compileOnSave: true,
	}

	fs.writeFileSync(path.join(destination, "tsconfig.json"), JSON.stringify(config, null, "\t"))
}

const initCodingChallengeTemplate = ({ destination }: IProjectConfig) => {
	const template = `import * as fs from 'fs'
import * as path from 'path'

const input = fs.readFileSync(path.join(__dirname, '..','testcases', 'input.txt')).toString()
`
	const srcDir = path.join(destination, "src")
	const testDir = path.join(destination, "testcases")
	fs.writeFileSync(path.join(srcDir, "index.ts"), template)
	fs.mkdirSync(testDir)
	fs.writeFileSync(path.join(testDir, "input.txt"), "")
}

const initVSCodeLaunch = ({ destination }: IProjectConfig) => {
	const template = `{
	// Use IntelliSense to learn about possible attributes.
	// Hover to view descriptions of existing attributes.
	// For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
	"version": "0.2.0",
	"configurations": [
		{
			"type": "node",
			"request": "launch",
			"name": "Launch Program",
			"skipFiles": [
				"<node_internals>/**"
			],
			"program": "\${workspaceFolder}/dist/index.js",
			"preLaunchTask": "tsc: build - tsconfig.json",
			"outFiles": [
				"\${workspaceFolder}/dist/**/*.js"
			]
		}
	]
}
`
	const vscodeDir = path.join(destination, ".vscode")
	fs.mkdirSync(vscodeDir)
	fs.writeFileSync(path.join(vscodeDir, "launch.json"), template)
}

;(async () => {
	const name = yargs.argv._[0]

	if (!name) {
		yargs.showHelp()
		process.exit()
	}

	const destination = initProjectDir(name)

	const config: IProjectConfig = {
		name,
		destination,
	}

	initPackageJson(config)

	const dependencies = ["typescript"]
	const devDependencies = ["prettier", "@types/node"]

	const install = installNpmPackage(destination)
	for (const dependency of dependencies) {
		await install(dependency)
	}
	const installDev = installNpmPackage(destination, true)
	for (const dependency of devDependencies) {
		await installDev(dependency)
	}

	initSrcDir(config)
	prettierConfig(config)
	fs.writeFileSync(path.join(destination, "README.md"), `# ${name}`)

	initVSCodeLaunch(config)
	if (yargs.argv.git) {
		await gitInit(config)
	}

	if (yargs.argv.cc) {
		initCodingChallengeTemplate(config)
	}

	tsConfig(config)
})().catch(console.error)
