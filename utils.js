const chalk = require('chalk');
const https = require('https');
const fs = require('fs');
const cp = require('node:child_process');
const inquirer = require('inquirer');
const error = chalk.bold.red;
const gary = chalk.bold.whiteBright;
const magenta = chalk.bold.magenta;
const warning = chalk.hex('#FFA500');
const accept = chalk.bold.green;
const done = accept('[done]');

async function getJSON(url) {
	const str = await req(url);
	return JSON.parse(str);
}

function req(options) {
	return new Promise((resolve, reject) => {
		const req = https.request(options, (res) => {
			let body = '';
			res.on('data', (chunk) => {
				body += chunk;
			});
			res.on('end', () => {
				resolve(body);
			});
		});
		req.on('error', (err) => {
			reject(err);
		});
		req.end();
	});
}

async function getNpmPackageVersions(packageName) {
	process.stdout.write(
		`Getting the lastest dependencies versions for ${magenta(
			packageName
		)}...  `
	);
	const data = await getJSON(`https://registry.npmjs.org/${packageName}`);
	console.log(done);
	const versions = Object.keys(data.versions)
		.map((v) => [...v.split('-'), v])
		.filter((v) => v[0] !== '0.0.1' && !v[1].includes('internal'))
		.map((v) => {
			if (v.length < 3) return [v[0], v[0]];
			const gameVersion = v[1];
			const version = v[v.length - 1];
			if (gameVersion.startsWith('rc')) {
				return [v[0] + '-rc', version];
			} else if (gameVersion.startsWith('beta')) {
				return [v[0] + '-beta', version];
			} else if (gameVersion.startsWith('preview')) {
				return [v[0] + '-rc', version];
			}
		})
		.reduce((acc, [key, value]) => {
			if (!acc[key]) {
				acc[key] = [];
			}
			acc[key].push(value);
			return acc;
		}, {});
	return versions;
}

async function getLatestServerVersion() {
	const versions = await getNpmPackageVersions('@minecraft/server');
	return versions[Object.keys(versions).sort().reverse()[0]]
		.sort()
		.reverse()[0];
}

async function mkdir(dirs) {
	for (let x of dirs) {
		if (!fs.existsSync(x)) {
			fs.mkdirSync(x);
			console.log(x, done);
		}
	}
}

function writeText(filename, text) {
	fs.writeFileSync(filename, text);
	console.log(filename, done);
}

function writeJSON(filename, obj) {
	fs.writeFileSync(filename, JSON.stringify(obj, null, '\t'));
	console.log(filename, done);
}

function exec(command, withLog = true) {
	if (withLog) cp.execSync(command, { stdio: [0, 1, 2] });
	else cp.execSync(command, { stdio: 'ignore' });
}

async function askBase(str, options) {
	const { answer } = await inquirer.prompt([
		{
			type: 'list',
			name: 'answer',
			message: str,
			choices: options
		}
	]);
	return answer;
}

async function askYes(str, flip = true) {
	const { answer } = await askBase(str, ['no', 'yes']);
	return flip ? answer === 'yes' : answer === 'no';
}

async function askVersion(packageName) {
	const versions = await getNpmPackageVersions(packageName);

	const keys = Object.keys(versions).sort().reverse();
	const keyChoices = keys.map((key) => ({ name: key }));
	const { selectedKey } = await inquirer.prompt([
		{
			type: 'list',
			name: 'selectedKey',
			message: `Select yor ${magenta(packageName)} version in manifest`,
			choices: keyChoices
		}
	]);

	const sortedObjects = versions[selectedKey].sort().reverse();
	const objectChoices = sortedObjects.map((obj) => ({ name: obj }));
	const { selectedObject } = await inquirer.prompt([
		{
			type: 'list',
			name: 'selectedObject',
			message: `Select yor ${magenta(packageName)} version in npm`,
			choices: objectChoices
		}
	]);

	return [selectedKey, selectedObject];
}

async function askRequire(packagename) {
	const need = (await askYes(`Require ${magenta(packagename)}? `)) === 'yes';
	let version = { mode: 'latest' };
	if (need) version = await askVersion(packagename);

	return [need, version];
}

function checkPnpm() {
	try {
		exec('pnpm --version', false);
	} catch (e) {
		return false;
	}
	return true;
}

function npmInstall(context) {
	if (context.pnpm) {
		console.log(
			accept(
				'Detects that you have pnpm and will automatically enable the pnpm installation dependency.'
			)
		);
		exec('pnpm install');
	} else exec('npm install');
}

module.exports = {
	error,
	gary,
	magenta,
	warning,
	accept,
	done,
	getJSON,
	req,
	getNpmPackageVersions,
	getLatestServerVersion,
	mkdir,
	writeJSON,
	writeText,
	exec,
	askBase,
	askRequire,
	askVersion,
	askYes,
	checkPnpm,
	npmInstall
};
