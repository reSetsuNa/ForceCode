import * as vscode from 'vscode';
import fs = require('fs-extra');
import path = require('path');
import { configuration } from './../services';
import constants from './../models/constants';

export default function createClass() {
    const CUSTOM_CLASS: string = 'Custom';
    var classesPath: string;
    // Here is replaceSrc possiblity
    return configuration().then(() => {
        classesPath = `${vscode.window.forceCode.workspaceRoot}${path.sep}classes`;
        if (fs.statSync(classesPath).isDirectory()) {
            return userClassSelection().then(selectedOption => {
                if (selectedOption) {
                    return userFileNameSelection(selectedOption.label).then(filename => {
                        if (filename) {
                            return generateFile(filename).then(res => {
                                let fp: string = res[0].toString();
                                return vscode.workspace.openTextDocument(fp).then(document => {
                                    return vscode.window.showTextDocument(document, vscode.ViewColumn.One);
                                });
                            });

                        }
                        return undefined;
                    });
                }
                return undefined;
            });
        } else {
            throw { message: classesPath + ' is not a real folder. Check the src option in your config file.' };
        }
    }).catch(err => vscode.window.showErrorMessage(err.message));


    function userClassSelection() {
        var classOptions: any = [
            {
                title: CUSTOM_CLASS,
                description: 'Any custom class that does not fit standard conventions.',
            }, {
                title: 'Controller',
                description: 'The Controller layer marshals data from the service to provide to the view.',
            }, {
                title: 'Model',
                description: 'Plain Old Class Objects used to normalize data from repositories.',
            }, {
                title: 'Service',
                description: 'The Service Layer contains business logic, calculations, and processes.',
            }, {
                title: 'Repository',
                description: 'The Repository layer contains code responsible for querying records from the database.',
            },
        ];
        let options: vscode.QuickPickItem[] = classOptions.map(res => {
            return {
                description: res.description,
                label: res.title,
            };
        });
        return vscode.window.showQuickPick(options);
    }

    function userFileNameSelection(classType) {
        // don't force name convention for custom class type.
        if (classType === CUSTOM_CLASS) {
            classType = '';
        }
        let options: vscode.InputBoxOptions = {
            placeHolder: 'Base name',
            prompt: `Enter ${classType} class name. ${classType}.cls will appended to this name`,
        };
        return vscode.window.showInputBox(options).then(classname => {
            if (classname) {
                if (classname.indexOf(' ') > -1) {
                    classname = classname.replace(' ', '');
                }
                if (classname.endsWith('.cls')) {
                    classname = classname.substring(0, classname.lastIndexOf('.cls'));
                }
                return classname + classType;
            }
            return undefined;
        });
    }

    function generateFile(classname) {
		
		if (vscode.window.forceCode.config.handleMetaFiles) {
			return Promise.all([writeFile(), writeMetaFile()]);
		} else {
			return Promise.all([writeFile()]);
		}
		
        function writeFile() {
            return new Promise(function (resolve, reject) {
                // Write Class file
                var finalClassName: string = classesPath + path.sep + classname + '.cls';
                fs.stat(finalClassName, function (err, stats) {
                    if (!err) {
                        vscode.window.showErrorMessage('Cannot create ' + finalClassName + '. A file with that name already exists!');
                    } else if (err.code === 'ENOENT') {
                        var classFile: string = `public with sharing class ${classname} {

}`;
                        fs.outputFile(finalClassName, classFile, function (writeErr) {
                            if (writeErr) {
                                vscode.window.showErrorMessage(writeErr.message);
                                reject(writeErr);
                            } else {
                                vscode.window.forceCode.showStatus('ForceCode: ' + classname + ' was sucessfully created $(check)');
                                resolve(finalClassName);
                            }
                        });
                    } else {
                        vscode.window.showErrorMessage(err.code);
                        reject(err);
                    }
                });
            });
        }

        // Write Metadata file
        function writeMetaFile() {
            var finalMetadataName: string = classesPath + path.sep + classname + '.cls-meta.xml';
            return new Promise(function (resolve, reject) {
                fs.stat(finalMetadataName, function (err, stats) {
                    if (!err) {
                        vscode.window.showErrorMessage('Cannot create ' + finalMetadataName + '. A file with that name already exists!');
                    } else if (err.code === 'ENOENT') {

                        var metaFile: string = `<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${config.apiVersion || vscode.window.forceCode.conn.version || constants.API_VERSION}</apiVersion>
    <status>Active</status>
</ApexClass>`;

                        fs.outputFile(finalMetadataName, metaFile, function (writeError) {
                            if (writeError) {
                                vscode.window.showErrorMessage(writeError.message);
                                reject(err);
                            }
                            resolve(finalMetadataName);
                        });
                    } else {
                        reject(err);
                    }
                });

            });
        }

    }

}
