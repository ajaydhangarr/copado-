import { LightningElement, track } from 'lwc';

const SAMPLE_ORIGINAL = `function calculateTotal(price, tax, discount) {
    // Calculate subtotal
    const subtotal = price + tax;
    
    // Apply discount
    const total = subtotal - discount;
    
    console.log('Total is: ' + total);
    return total;
}`;

const SAMPLE_MODIFIED = `function calculateTotal(price, tax, discount) {
    if (price < 0) {
        throw new Error('Price cannot be negative');
    }
    
    // Calculate subtotal including tax rate
    const subtotal = price + (price * tax);
    
    // Apply discount if valid
    const total = discount ? (subtotal - discount) : subtotal;
    
    console.log(\`Final Total: \${total}\`);
    return total;
}`;

export default class CodeChecker extends LightningElement {
    originalCode = '';
    modifiedCode = '';
    ignoreWhitespace = false;
    caseInsensitive = false;
    viewMode = 'side-by-side'; // 'side-by-side' or 'inline'

    isCompared = false;

    @track alignedRows = [];
    @track inlineLines = [];
    @track changesList = [];
    // @track deletedLines = [];
    // @track addedLines = [];
    // finalCode = '';
    // copySuccess = false;

    @track stats = {
        additions: 0,
        deletions: 0,
        matchPercentage: 100
    };

    _leftScrollSyncing = false;
    _rightScrollSyncing = false;
    _isProgrammaticScroll = false;
    _scrollTimeout = null;

    get isSideBySide() {
        return this.viewMode === 'side-by-side';
    }

    get isInline() {
        return this.viewMode === 'inline';
    }

    get hasResults() {
        return this.isCompared;
    }

    // get hasDeletions() {
    //     return this.deletedLines && this.deletedLines.length > 0;
    // }

    // get hasAdditions() {
    //     return this.addedLines && this.addedLines.length > 0;
    // }

    // get hasChanges() {
    //     return this.hasDeletions || this.hasAdditions;
    // }

    // get copyButtonLabel() {
    //     return this.copySuccess ? '✓ Copied!' : 'Copy Code';
    // }

    get viewModeOptions() {
        return [
            { label: 'Side-by-Side', value: 'side-by-side' },
            { label: 'Inline', value: 'inline' }
        ];
    }

    handleOriginalChange(event) {
        this.originalCode = event.target.value;
    }

    handleModifiedChange(event) {
        this.modifiedCode = event.target.value;
    }

    handleToggleWhitespace(event) {
        this.ignoreWhitespace = event.target.checked;
        if (this.isCompared) {
            this.compareCodes();
        }
    }

    handleToggleCase(event) {
        this.caseInsensitive = event.target.checked;
        if (this.isCompared) {
            this.compareCodes();
        }
    }

    handleViewModeChange(event) {
        this.viewMode = event.target.value;
    }

    loadSampleData() {
        this.originalCode = SAMPLE_ORIGINAL;
        this.modifiedCode = SAMPLE_MODIFIED;

        // Update textarea values in the UI manually as LWC textareas might not show reactive updates if user typed in them
        const originalInput = this.template.querySelector('.original-input');
        const modifiedInput = this.template.querySelector('.modified-input');
        if (originalInput) originalInput.value = SAMPLE_ORIGINAL;
        if (modifiedInput) modifiedInput.value = SAMPLE_MODIFIED;

        this.compareCodes();
    }

    handleCompare() {
        this.compareCodes();
    }

    handleReset() {
        this.originalCode = '';
        this.modifiedCode = '';
        this.isCompared = false;
        this.alignedRows = [];
        this.inlineLines = [];
        this.changesList = [];
        // this.deletedLines = [];
        // this.addedLines = [];
        // this.finalCode = '';
        // this.copySuccess = false;
        this.stats = {
            additions: 0,
            deletions: 0,
            matchPercentage: 100
        };

        const originalInput = this.template.querySelector('.original-input');
        const modifiedInput = this.template.querySelector('.modified-input');
        if (originalInput) originalInput.value = '';
        if (modifiedInput) modifiedInput.value = '';
    }

    compareCodes() {
        const oldLines = this.originalCode ? this.originalCode.split(/\r?\n/) : [];
        const newLines = this.modifiedCode ? this.modifiedCode.split(/\r?\n/) : [];

        const diff = this.diffLines(oldLines, newLines, this.ignoreWhitespace, this.caseInsensitive);

        // Calculate statistics
        let additionsCount = 0;
        let deletionsCount = 0;
        let unchangedCount = 0;

        diff.forEach(item => {
            if (item.type === 'added') additionsCount++;
            else if (item.type === 'removed') deletionsCount++;
            else if (item.type === 'unchanged') unchangedCount++;
        });

        const totalLines = Math.max(oldLines.length, newLines.length);
        const matchPercentage = totalLines > 0
            ? Math.round((unchangedCount / totalLines) * 100)
            : 100;

        this.stats = {
            additions: additionsCount,
            deletions: deletionsCount,
            matchPercentage: matchPercentage
        };

        // Align rows for Side-by-Side and generate inline lines
        this.alignedRows = this.getAlignedRows(diff);
        this.inlineLines = this.getInlineLines(diff);

        // Build deleted and added line lists for Changes Summary
        // let delIdx = 0;
        // let addIdx = 0;
        // this.deletedLines = diff
        //     .filter(item => item.type === 'removed')
        //     .map(item => ({
        //         key: `del-${delIdx++}`,
        //         lineNum: item.oldLineNum,
        //         text: item.text || ' '
        //     }));

        // this.addedLines = diff
        //     .filter(item => item.type === 'added')
        //     .map(item => ({
        //         key: `add-${addIdx++}`,
        //         lineNum: item.newLineNum,
        //         text: item.text || ' '
        //     }));

        // Build final code from unchanged + added lines (the resulting modified code)
        // this.finalCode = diff
        //     .filter(item => item.type !== 'removed')
        //     .map(item => item.text)
        //     .join('\n');

        // this.copySuccess = false;
        this.isCompared = true;

        // Auto-scroll to first change if any
        if (this.changesList && this.changesList.length > 0) {
            const firstChange = this.changesList[0];
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                const targetKey = this.isSideBySide ? firstChange.sideBySideKey : firstChange.inlineKey;
                this.scrollToTarget(targetKey);
            }, 200);
        }
    }

    // handleCopyFinalCode() {
    //     if (navigator.clipboard && navigator.clipboard.writeText) {
    //         navigator.clipboard.writeText(this.finalCode)
    //             .then(() => {
    //                 this.copySuccess = true;
    //                 // eslint-disable-next-line @lwc/lwc/no-async-operation
    //                 setTimeout(() => {
    //                     this.copySuccess = false;
    //                 }, 2000);
    //             })
    //             .catch(() => {
    //                 this._fallbackCopy(this.finalCode);
    //             });
    //     } else {
    //         this._fallbackCopy(this.finalCode);
    //     }
    // }

    // _fallbackCopy(text) {
    //     const textarea = document.createElement('textarea');
    //     textarea.value = text;
    //     textarea.style.position = 'fixed';
    //     textarea.style.opacity = '0';
    //     document.body.appendChild(textarea);
    //     textarea.focus();
    //     textarea.select();
    //     try {
    //         document.execCommand('copy');
    //         this.copySuccess = true;
    //         // eslint-disable-next-line @lwc/lwc/no-async-operation
    //         setTimeout(() => {
    //             this.copySuccess = false;
    //         }, 2000);
    //     } catch (e) {
    //         // copy failed silently
    //     }
    //     document.body.removeChild(textarea);
    // }

    diffLines(oldLines, newLines, ignoreWhitespace, caseInsensitive) {
        const clean = str => {
            let val = str || '';
            if (ignoreWhitespace) {
                val = val.trim().replace(/\s+/g, ' ');
            }
            if (caseInsensitive) {
                val = val.toLowerCase();
            }
            return val;
        };

        const M = oldLines.length;
        const N = newLines.length;

        // DP table for LCS
        const dp = Array.from({ length: M + 1 }, () => new Array(N + 1).fill(0));

        for (let i = 1; i <= M; i++) {
            for (let j = 1; j <= N; j++) {
                if (clean(oldLines[i - 1]) === clean(newLines[j - 1])) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        // Backtrack to build the diff list
        const diff = [];
        let i = M, j = N;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && clean(oldLines[i - 1]) === clean(newLines[j - 1])) {
                diff.unshift({
                    type: 'unchanged',
                    oldLineNum: i,
                    newLineNum: j,
                    text: oldLines[i - 1]
                });
                i--;
                j--;
            } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                diff.unshift({
                    type: 'added',
                    oldLineNum: null,
                    newLineNum: j,
                    text: newLines[j - 1]
                });
                j--;
            } else {
                diff.unshift({
                    type: 'removed',
                    oldLineNum: i,
                    newLineNum: null,
                    text: oldLines[i - 1]
                });
                i--;
            }
        }

        return diff;
    }

    getAlignedRows(diff) {
        const rows = [];
        const changes = [];
        let i = 0;
        const len = diff.length;

        while (i < len) {
            if (diff[i].type === 'unchanged') {
                rows.push({
                    key: `row-${i}`,
                    left: {
                        lineNum: diff[i].oldLineNum,
                        text: diff[i].text,
                        class: 'diff-line unchanged'
                    },
                    right: {
                        lineNum: diff[i].newLineNum,
                        text: diff[i].text,
                        class: 'diff-line unchanged'
                    }
                });
                i++;
            } else {
                // Gather consecutive removed and added blocks
                const removedBlock = [];
                const addedBlock = [];
                const blockStartIndex = i;

                while (i < len && (diff[i].type === 'removed' || diff[i].type === 'added')) {
                    if (diff[i].type === 'removed') {
                        removedBlock.push(diff[i]);
                    } else {
                        addedBlock.push(diff[i]);
                    }
                    i++;
                }

                const maxLen = Math.max(removedBlock.length, addedBlock.length);
                for (let j = 0; j < maxLen; j++) {
                    const rem = removedBlock[j] || null;
                    const add = addedBlock[j] || null;
                    const rowKey = `row-${blockStartIndex}-${j}`;

                    rows.push({
                        key: rowKey,
                        left: rem ? {
                            lineNum: rem.oldLineNum,
                            text: rem.text,
                            class: 'diff-line removed'
                        } : {
                            lineNum: '',
                            text: '',
                            class: 'diff-line empty'
                        },
                        right: add ? {
                            lineNum: add.newLineNum,
                            text: add.text,
                            class: 'diff-line added'
                        } : {
                            lineNum: '',
                            text: '',
                            class: 'diff-line empty'
                        }
                    });

                    // Add to changes list
                    let label = '';
                    let badgeClass = '';
                    let inlineIndex = -1;

                    if (rem && add) {
                        label = `Mod: Line ${rem.oldLineNum} ➔ ${add.newLineNum}`;
                        badgeClass = 'change-badge modified-badge';
                        inlineIndex = diff.indexOf(rem);
                    } else if (rem) {
                        label = `Del: Line ${rem.oldLineNum}`;
                        badgeClass = 'change-badge deleted-badge';
                        inlineIndex = diff.indexOf(rem);
                    } else if (add) {
                        label = `Add: Line ${add.newLineNum}`;
                        badgeClass = 'change-badge added-badge';
                        inlineIndex = diff.indexOf(add);
                    }

                    changes.push({
                        key: rowKey,
                        sideBySideKey: rowKey,
                        inlineKey: `inline-${inlineIndex}`,
                        label: label,
                        badgeClass: badgeClass
                    });
                }
            }
        }
        this.changesList = changes;
        return rows;
    }

    handleJumpToChange(event) {
        const key = event.currentTarget.dataset.key;
        const changeItem = this.changesList.find(c => c.key === key);
        if (changeItem) {
            const targetKey = this.isSideBySide ? changeItem.sideBySideKey : changeItem.inlineKey;
            this.scrollToTarget(targetKey);
        }
    }

    scrollToTarget(targetKey) {
        const selector = `[data-key="${targetKey}"]`;
        const elements = this.template.querySelectorAll(selector);
        if (elements.length > 0) {
            // Temporarily disable scroll synchronization during programmatic scroll
            this._isProgrammaticScroll = true;
            if (this._scrollTimeout) {
                clearTimeout(this._scrollTimeout);
            }

            // Scroll both panes in Side-by-Side mode, or the single pane in Inline mode
            elements.forEach(el => {
                const container = el.closest('.pane-scroll');
                if (container) {
                    const containerRect = container.getBoundingClientRect();
                    const elementRect = el.getBoundingClientRect();
                    const targetScrollTop = (elementRect.top - containerRect.top + container.scrollTop) - (containerRect.height / 2) + (elementRect.height / 2);

                    if (typeof container.scrollTo === 'function') {
                        container.scrollTo({
                            top: targetScrollTop,
                            behavior: 'smooth'
                        });
                    } else {
                        container.scrollTop = targetScrollTop;
                    }
                }
            });

            // Also call scrollIntoView to center the target element/component on the main browser viewport
            elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Re-enable scroll sync after smooth scroll completes (~1000ms)
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            this._scrollTimeout = setTimeout(() => {
                this._isProgrammaticScroll = false;
            }, 1000);

            // Flash highlight effect on all matching elements
            elements.forEach(el => {
                el.classList.add('flash-highlight');
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => {
                    el.classList.remove('flash-highlight');
                }, 1000);
            });
        }
    }

    getInlineLines(diff) {
        return diff.map((line, idx) => {
            let lineClass = 'diff-line unchanged';
            let lineIndicator = ' ';
            let displayLineNum = '';

            if (line.type === 'added') {
                lineClass = 'diff-line added';
                lineIndicator = '+';
                displayLineNum = `+${line.newLineNum}`;
            } else if (line.type === 'removed') {
                lineClass = 'diff-line removed';
                lineIndicator = '-';
                displayLineNum = `-${line.oldLineNum}`;
            } else {
                displayLineNum = ` ${line.newLineNum}`;
            }

            return {
                key: `inline-${idx}`,
                text: line.text,
                class: lineClass,
                indicator: lineIndicator,
                lineNum: displayLineNum
            };
        });
    }

    // Scroll Synchronization for Side-by-Side view
    handleLeftScroll(event) {
        if (this._isProgrammaticScroll) {
            return;
        }
        if (this._rightScrollSyncing) {
            this._rightScrollSyncing = false;
            return;
        }
        const leftPane = event.target;
        const rightPane = this.template.querySelector('.right-pane');
        if (rightPane) {
            this._leftScrollSyncing = true;
            rightPane.scrollTop = leftPane.scrollTop;
            rightPane.scrollLeft = leftPane.scrollLeft;
        }
    }

    handleRightScroll(event) {
        if (this._isProgrammaticScroll) {
            return;
        }
        if (this._leftScrollSyncing) {
            this._leftScrollSyncing = false;
            return;
        }
        const rightPane = event.target;
        const leftPane = this.template.querySelector('.left-pane');
        if (leftPane) {
            this._rightScrollSyncing = true;
            leftPane.scrollTop = rightPane.scrollTop;
            leftPane.scrollLeft = rightPane.scrollLeft;
        }
    }
}