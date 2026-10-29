/* ============================================
   EXPENSEFLOW — EXPENSE TRACKER DASHBOARD
   Assignment 4 | Pynexia Technology

   Features:
   - Transaction management
   - Automatic financial calculations
   - LocalStorage persistence
   - Transaction filtering and search
   - Dynamic Chart.js visualization
   - Input validation
   - Responsive navigation
============================================ */

"use strict";


/* ============================================
   1. CONFIGURATION AND DOM ELEMENTS
============================================ */

const STORAGE_KEY = "expenseFlowTransactions";

const CURRENCY = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const elements = {
    totalBalance: document.getElementById("totalBalance"),
    totalIncome: document.getElementById("totalIncome"),
    totalExpenses: document.getElementById("totalExpenses"),

    insightIncome: document.getElementById("insightIncome"),
    insightExpenses: document.getElementById("insightExpenses"),
    insightBalance: document.getElementById("insightBalance"),
    insightMessage: document.getElementById("insightMessage"),

    transactionList: document.getElementById("transactionList"),
    transactionCount: document.getElementById("transactionCount"),
    transactionSummary: document.getElementById("transactionSummary"),
    emptyState: document.getElementById("emptyState"),

    transactionModal: document.getElementById("transactionModal"),
    transactionForm: document.getElementById("transactionForm"),
    modalTitle: document.getElementById("modalTitle"),

    addTransactionButton: document.getElementById("addTransactionButton"),
    emptyStateAddButton: document.getElementById("emptyStateAddButton"),
    closeModalButton: document.getElementById("closeModalButton"),
    cancelTransactionButton: document.getElementById(
        "cancelTransactionButton"
    ),

    description: document.getElementById("description"),
    amount: document.getElementById("amount"),
    category: document.getElementById("category"),
    date: document.getElementById("date"),

    descriptionError: document.getElementById("descriptionError"),
    amountError: document.getElementById("amountError"),
    categoryError: document.getElementById("categoryError"),
    dateError: document.getElementById("dateError"),
    formMessage: document.getElementById("formMessage"),

    transactionSearch: document.getElementById("transactionSearch"),
    clearSearchButton: document.getElementById("clearSearchButton"),

    menuToggle: document.getElementById("menuToggle"),
    sidebar: document.getElementById("sidebar"),

    currentDate: document.getElementById("currentDate"),
    currentYear: document.getElementById("currentYear"),

    financeChart: document.getElementById("financeChart"),

    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toastMessage")
};


/* ============================================
   2. APPLICATION STATE
============================================ */

let transactions = loadTransactions();

let activeFilter = "all";

let searchQuery = "";

let financeChart = null;

let toastTimeout = null;

let lastFocusedElement = null;


/* ============================================
   3. GENERAL UTILITIES
============================================ */

/**
 * Format a number as Ghanaian cedis.
 */
function formatCurrency(amount) {
    return CURRENCY.format(amount);
}


/**
 * Return today's date in YYYY-MM-DD format.
 *
 * Using local date components avoids UTC date shifts.
 */
function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, "0");

    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/**
 * Format a date for display.
 */
function formatDate(dateString) {
    const date = new Date(`${dateString}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}


/**
 * Escape HTML-sensitive characters.
 *
 * This helps prevent transaction descriptions from being
 * interpreted as HTML when rendered in the transaction table.
 */
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return replacements[character];
    });
}


/**
 * Generate a unique transaction identifier.
 */
function generateTransactionId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}


/* ============================================
   4. LOCALSTORAGE
============================================ */

/**
 * Read saved transactions.
 *
 * Invalid or corrupted data is handled safely.
 */
function loadTransactions() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return [];
        }

        const parsedData = JSON.parse(savedData);

        if (!Array.isArray(parsedData)) {
            return [];
        }

        return parsedData.filter(transaction => {
            return (
                transaction &&
                typeof transaction.id === "string" &&
                typeof transaction.description === "string" &&
                typeof transaction.amount === "number" &&
                Number.isFinite(transaction.amount) &&
                transaction.amount > 0 &&
                transaction.amount <= 999999999 &&
                ["income", "expense"].includes(transaction.type) &&
                typeof transaction.category === "string" &&
                typeof transaction.date === "string" &&
                isValidDate(transaction.date) &&
                transaction.description.trim().length > 0 &&
                transaction.description.length <= 100
            );
        });

    } catch (error) {
        console.error("Unable to load saved transactions:", error);

        return [];
    }
}


/**
 * Validate YYYY-MM-DD dates.
 */
function isValidDate(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }

    const date = new Date(`${dateString}T12:00:00`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === Number(dateString.slice(0, 4)) &&
        date.getMonth() + 1 === Number(dateString.slice(5, 7)) &&
        date.getDate() === Number(dateString.slice(8, 10))
    );
}


/**
 * Save current transactions.
 */
function saveTransactions() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(transactions)
        );

        return true;

    } catch (error) {
        console.error("Unable to save transactions:", error);

        showToast(
            "Unable to save data. Check your browser storage.",
            "error"
        );

        return false;
    }
}


/* ============================================
   5. DATE AND PAGE INITIALIZATION
============================================ */

function initializePage() {
    if (elements.currentYear) {
        elements.currentYear.textContent = new Date().getFullYear();
    }

    if (elements.currentDate) {
        elements.currentDate.textContent =
            new Intl.DateTimeFormat("en-GH", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }).format(new Date());
    }

    if (elements.date) {
        elements.date.value = getTodayDate();

        elements.date.max = getTodayDate();
    }

    initializeChart();

    updateDashboard();

    setupEventListeners();
}


/* ============================================
   6. FINANCIAL CALCULATIONS
============================================ */

/**
 * Calculate income, expenses and balance.
 *
 * Integer pesewas are used for the calculations to reduce
 * floating-point rounding errors.
 */
function calculateFinancialSummary() {
    let incomePesewas = 0;

    let expensePesewas = 0;

    transactions.forEach(transaction => {
        const amountPesewas = Math.round(transaction.amount * 100);

        if (transaction.type === "income") {
            incomePesewas += amountPesewas;
        } else {
            expensePesewas += amountPesewas;
        }
    });

    const balancePesewas = incomePesewas - expensePesewas;

    return {
        income: incomePesewas / 100,
        expenses: expensePesewas / 100,
        balance: balancePesewas / 100
    };
}


/**
 * Refresh all dashboard financial figures.
 */
function updateFinancialSummary() {
    const summary = calculateFinancialSummary();

    elements.totalBalance.textContent =
        formatCurrency(summary.balance);

    elements.totalIncome.textContent =
        formatCurrency(summary.income);

    elements.totalExpenses.textContent =
        formatCurrency(summary.expenses);

    elements.insightIncome.textContent =
        formatCurrency(summary.income);

    elements.insightExpenses.textContent =
        formatCurrency(summary.expenses);

    elements.insightBalance.textContent =
        formatCurrency(summary.balance);

    elements.totalBalance.style.color =
        summary.balance < 0 ? "var(--expense)" : "var(--primary)";

    updateFinancialInsight(summary);

    updateChart(summary);
}


/**
 * Display a simple financial insight.
 */
function updateFinancialInsight(summary) {
    let message;

    if (transactions.length === 0) {
        message = "Start by recording your first income or expense.";

    } else if (summary.balance < 0) {
        message =
            "Your recorded expenses exceed your income. Review your spending.";

    } else if (summary.balance === 0) {
        message =
            "Your income and expenses are currently equal.";

    } else if (summary.income === 0 && summary.expenses === 0) {
        message =
            "Add transactions to see your financial overview.";

    } else {
        const savingsRate = summary.income > 0
            ? (summary.balance / summary.income) * 100
            : 0;

        if (summary.income === 0) {
            message =
                "Record your income to understand your overall finances.";

        } else if (savingsRate >= 20) {
            message =
                "Your current balance is positive. Keep monitoring your spending.";

        } else {
            message =
                "Your balance is positive. Track your expenses to manage your money.";
        }
    }

    elements.insightMessage.innerHTML = `
        <i class="fa-solid fa-lightbulb"></i>
        <p>${escapeHTML(message)}</p>
    `;
}


/* ============================================
   7. CHART.JS
============================================ */

/**
 * Initialize the income-versus-expenses chart.
 */
function initializeChart() {
    if (
        !elements.financeChart ||
        typeof Chart === "undefined"
    ) {
        console.warn(
            "Chart.js is unavailable. The rest of the dashboard can still work."
        );

        return;
    }

    const context = elements.financeChart.getContext("2d");

    financeChart = new Chart(context, {
        type: "bar",

        data: {
            labels: ["Financial Overview"],

            datasets: [
                {
                    label: "Income",

                    data: [0],

                    backgroundColor: "#10b981",

                    borderRadius: 7,

                    borderSkipped: false,

                    maxBarThickness: 48
                },

                {
                    label: "Expenses",

                    data: [0],

                    backgroundColor: "#fb7185",

                    borderRadius: 7,

                    borderSkipped: false,

                    maxBarThickness: 48
                }
            ]
        },

        options: {
            responsive: true,

            maintainAspectRatio: false,

            animation: {
                duration: 400
            },

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    backgroundColor: "#0b1120",

                    titleColor: "#f1f5f9",

                    bodyColor: "#cbd5e1",

                    borderColor: "#26354c",

                    borderWidth: 1,

                    padding: 12,

                    callbacks: {
                        label(context) {
                            return `${context.dataset.label}: ${
                                formatCurrency(context.raw)
                            }`;
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },

                    ticks: {
                        color: "#94a3b8",
                        font: {
                            family: "DM Sans",
                            size: 11
                        }
                    },

                    border: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    grid: {
                        color: "rgba(148, 163, 184, 0.1)"
                    },

                    ticks: {
                        color: "#94a3b8",

                        maxTicksLimit: 6,

                        callback(value) {
                            return `GH₵ ${Number(value).toLocaleString(
                                "en-GH"
                            )}`;
                        }
                    },

                    border: {
                        display: false
                    }
                }
            }
        }
    });
}


/**
 * Update chart data after transactions change.
 */
function updateChart(summary) {
    if (!financeChart) {
        return;
    }

    financeChart.data.datasets[0].data = [summary.income];

    financeChart.data.datasets[1].data = [summary.expenses];

    financeChart.update();
}


/* ============================================
   8. TRANSACTION ICONS
============================================ */

function getCategoryIcon(category) {
    const icons = {
        Salary: "fa-money-bill-wave",
        Business: "fa-briefcase",
        Freelance: "fa-laptop-code",
        Food: "fa-utensils",
        Transport: "fa-car",
        Bills: "fa-file-invoice",
        Health: "fa-heart-pulse",
        Education: "fa-graduation-cap",
        Shopping: "fa-bag-shopping",
        Entertainment: "fa-film",
        Family: "fa-people-group",
        Other: "fa-wallet"
    };

    return icons[category] || "fa-wallet";
}


/* ============================================
   9. FILTERING AND SEARCH
============================================ */

/**
 * Return transactions matching the selected filter and search.
 */
function getFilteredTransactions() {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...transactions]
        .filter(transaction => {
            if (activeFilter === "all") {
                return true;
            }

            return transaction.type === activeFilter;
        })
        .filter(transaction => {
            if (!normalizedQuery) {
                return true;
            }

            return (
                transaction.description.toLowerCase().includes(
                    normalizedQuery
                ) ||
                transaction.category.toLowerCase().includes(
                    normalizedQuery
                )
            );
        })
        .sort((a, b) => {
            const dateComparison = b.date.localeCompare(a.date);

            if (dateComparison !== 0) {
                return dateComparison;
            }

            return b.id.localeCompare(a.id);
        });
}


/**
 * Update the selected filter button.
 */
function updateFilterButtons() {
    document.querySelectorAll(".filter-button").forEach(button => {
        const isActive = button.dataset.filter === activeFilter;

        button.classList.toggle("active", isActive);

        button.setAttribute("aria-pressed", String(isActive));
    });
}


/* ============================================
   10. RENDER TRANSACTIONS
============================================ */

/**
 * Display filtered transactions in the table.
 */
function renderTransactions() {
    const filteredTransactions = getFilteredTransactions();

    const hasTransactions = transactions.length > 0;

    const hasResults = filteredTransactions.length > 0;

    elements.transactionList.innerHTML = filteredTransactions
        .map(transaction => {
            const isIncome = transaction.type === "income";

            const icon = getCategoryIcon(transaction.category);

            const sign = isIncome ? "+" : "−";

            const amount = formatCurrency(transaction.amount);

            const description = escapeHTML(transaction.description);

            const category = escapeHTML(transaction.category);

            const date = formatDate(transaction.date);

            return `
                <tr>
                    <td>
                        <div class="transaction-name">

                            <div class="transaction-icon ${
                                isIncome ? "income" : "expense"
                            }">
                                <i class="fa-solid ${icon}"></i>
                            </div>

                            <span
                                class="transaction-name-text"
                                title="${description}"
                            >
                                ${description}
                            </span>

                        </div>
                    </td>

                    <td>
                        <span class="transaction-category">
                            ${category}
                        </span>
                    </td>

                    <td>
                        <span class="transaction-date">
                            ${date}
                        </span>
                    </td>

                    <td>
                        <span class="transaction-amount ${
                            isIncome ? "income" : "expense"
                        }">
                            ${sign}${amount}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="delete-button"
                            data-delete-id="${escapeHTML(transaction.id)}"
                            aria-label="Delete ${description}"
                            title="Delete transaction"
                        >
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        })
        .join("");

    elements.transactionCount.textContent =
        `${transactions.length} ${
            transactions.length === 1 ? "transaction" : "transactions"
        }`;

    elements.transactionSummary.textContent =
        `Showing ${filteredTransactions.length} of ${
            transactions.length
        } transactions`;

    elements.emptyState.hidden = hasResults;

    elements.transactionList.closest(".table-container").hidden =
        !hasResults;

    elements.transactionSummary.parentElement.hidden = !hasTransactions;

    if (!hasTransactions) {
        elements.emptyState.querySelector("h3").textContent =
            "No transactions yet";

        elements.emptyState.querySelector("p").textContent =
            "Your transactions will appear here after you add your first record.";

        elements.emptyStateAddButton.hidden = false;

    } else if (!hasResults) {
        elements.emptyState.querySelector("h3").textContent =
            "No matching transactions";

        elements.emptyState.querySelector("p").textContent =
            "Try another search term or change the selected filter.";

        elements.emptyStateAddButton.hidden = true;
    }
}


/**
 * Refresh all dashboard components.
 */
function updateDashboard() {
    updateFinancialSummary();

    renderTransactions();

    updateFilterButtons();
}


/* ============================================
   11. MODAL MANAGEMENT
============================================ */

/**
 * Open the transaction form.
 */
function openModal() {
    lastFocusedElement = document.activeElement;

    elements.transactionForm.reset();

    clearValidationErrors();

    elements.date.value = getTodayDate();

    elements.date.max = getTodayDate();

    elements.modalTitle.textContent = "Add Transaction";

    elements.formMessage.textContent = "";

    elements.transactionModal.hidden = false;

    elements.transactionModal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
        elements.description.focus();
    });
}


/**
 * Close the transaction form.
 */
function closeModal() {
    elements.transactionModal.hidden = true;

    elements.transactionModal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";

    if (lastFocusedElement && lastFocusedElement.isConnected) {
        lastFocusedElement.focus();
    }
}


/* ============================================
   12. FORM VALIDATION
============================================ */

/**
 * Remove existing validation messages.
 */
function clearValidationErrors() {
    elements.descriptionError.textContent = "";

    elements.amountError.textContent = "";

    elements.categoryError.textContent = "";

    elements.dateError.textContent = "";

    elements.formMessage.textContent = "";

    [
        elements.description,
        elements.amount,
        elements.category,
        elements.date
    ].forEach(field => {
        field.removeAttribute("aria-invalid");
    });
}


/**
 * Display an individual field error.
 */
function setFieldError(field, errorElement, message) {
    errorElement.textContent = message;

    field.setAttribute("aria-invalid", "true");
}


/**
 * Validate the form before saving.
 */
function validateTransactionForm() {
    clearValidationErrors();

    let isValid = true;

    const description = elements.description.value.trim();

    const amountValue = elements.amount.value.trim();

    const amount = Number(amountValue);

    const category = elements.category.value;

    const date = elements.date.value;

    const type = document.querySelector(
        'input[name="type"]:checked'
    )?.value;

    if (!description) {
        setFieldError(
            elements.description,
            elements.descriptionError,
            "Please enter a transaction description."
        );

        isValid = false;

    } else if (description.length > 100) {
        setFieldError(
            elements.description,
            elements.descriptionError,
            "Description must not exceed 100 characters."
        );

        isValid = false;
    }

    if (
        amountValue === "" ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > 999999999
    ) {
        setFieldError(
            elements.amount,
            elements.amountError,
            "Enter a valid amount greater than GH₵ 0.00."
        );

        isValid = false;
    }

    if (!category) {
        setFieldError(
            elements.category,
            elements.categoryError,
            "Please select a category."
        );

        isValid = false;
    }

    if (!date || !isValidDate(date)) {
        setFieldError(
            elements.date,
            elements.dateError,
            "Please select a valid transaction date."
        );

        isValid = false;

    } else if (date > getTodayDate()) {
        setFieldError(
            elements.date,
            elements.dateError,
            "The transaction date cannot be in the future."
        );

        isValid = false;
    }

    if (!["income", "expense"].includes(type)) {
        elements.formMessage.textContent =
            "Please select a transaction type.";

        isValid = false;
    }

    if (!isValid) {
        elements.formMessage.textContent =
            "Please correct the highlighted fields.";

        const firstInvalidField = elements.transactionForm.querySelector(
            '[aria-invalid="true"]'
        );

        if (firstInvalidField) {
            firstInvalidField.focus();
        }
    }

    return isValid;
}


/* ============================================
   13. ADD TRANSACTION
============================================ */

/**
 * Create and save a transaction.
 */
function addTransaction(event) {
    event.preventDefault();

    if (!validateTransactionForm()) {
        return;
    }

    const description = elements.description.value.trim();

    const amount = Math.round(
        Number(elements.amount.value) * 100
    ) / 100;

    const category = elements.category.value;

    const date = elements.date.value;

    const type = document.querySelector(
        'input[name="type"]:checked'
    ).value;

    const transaction = {
        id: generateTransactionId(),

        description,

        amount,

        category,

        date,

        type
    };

    transactions.push(transaction);

    if (!saveTransactions()) {
        transactions.pop();

        return;
    }

    activeFilter = "all";

    searchQuery = "";

    elements.transactionSearch.value = "";

    updateDashboard();

    closeModal();

    showToast(
        type === "income"
            ? "Income added successfully."
            : "Expense added successfully."
    );
}


/* ============================================
   14. DELETE TRANSACTION
============================================ */

/**
 * Delete an existing transaction.
 */
function deleteTransaction(transactionId) {
    const transactionIndex = transactions.findIndex(
        transaction => transaction.id === transactionId
    );

    if (transactionIndex === -1) {
        showToast("Transaction not found.", "error");

        return;
    }

    const deletedTransaction = transactions[transactionIndex];

    const confirmed = window.confirm(
        `Delete "${deletedTransaction.description}"? This action cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    transactions.splice(transactionIndex, 1);

    if (!saveTransactions()) {
        transactions.splice(transactionIndex, 0, deletedTransaction);

        return;
    }

    updateDashboard();

    showToast("Transaction deleted successfully.");
}


/* ============================================
   15. TOAST NOTIFICATIONS
============================================ */

/**
 * Display a temporary notification.
 */
function showToast(message, type = "success") {
    clearTimeout(toastTimeout);

    elements.toastMessage.textContent = message;

    const icon = elements.toast.querySelector("i");

    if (type === "error") {
        icon.className = "fa-solid fa-circle-exclamation";

        icon.style.color = "var(--expense)";

    } else {
        icon.className = "fa-solid fa-circle-check";

        icon.style.color = "var(--primary)";
    }

    elements.toast.classList.add("show");

    toastTimeout = setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 3000);
}


/* ============================================
   16. MOBILE NAVIGATION
============================================ */

/**
 * Toggle the mobile sidebar.
 */
function toggleSidebar(forceClose = false) {
    const shouldOpen = forceClose
        ? false
        : !elements.sidebar.classList.contains("open");

    elements.sidebar.classList.toggle("open", shouldOpen);

    elements.menuToggle.setAttribute(
        "aria-expanded",
        String(shouldOpen)
    );

    elements.menuToggle.setAttribute(
        "aria-label",
        shouldOpen ? "Close navigation" : "Open navigation"
    );

    elements.menuToggle.innerHTML = shouldOpen
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
}


/* ============================================
   17. EVENT LISTENERS
============================================ */

function setupEventListeners() {

    // Open the transaction modal.
    elements.addTransactionButton.addEventListener(
        "click",
        openModal
    );

    elements.emptyStateAddButton.addEventListener(
        "click",
        openModal
    );


    // Close the modal.
    elements.closeModalButton.addEventListener(
        "click",
        closeModal
    );

    elements.cancelTransactionButton.addEventListener(
        "click",
        closeModal
    );


    // Close the modal by clicking the backdrop.
    elements.transactionModal.addEventListener("click", event => {
        if (event.target === elements.transactionModal) {
            closeModal();
        }
    });


    // Close the modal using Escape.
    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            !elements.transactionModal.hidden
        ) {
            closeModal();
        }

        if (
            event.key === "Escape" &&
            elements.sidebar.classList.contains("open")
        ) {
            toggleSidebar(true);
        }
    });


    // Submit a new transaction.
    elements.transactionForm.addEventListener(
        "submit",
        addTransaction
    );


    // Filter transactions.
    document.querySelectorAll(".filter-button").forEach(button => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.filter;

            updateDashboard();
        });
    });


    // Search transactions.
    elements.transactionSearch.addEventListener("input", event => {
        searchQuery = event.target.value;

        renderTransactions();
    });


    // Clear search.
    elements.clearSearchButton.addEventListener("click", () => {
        elements.transactionSearch.value = "";

        searchQuery = "";

        renderTransactions();

        elements.transactionSearch.focus();
    });


    // Delete transactions using event delegation.
    elements.transactionList.addEventListener("click", event => {
        const deleteButton = event.target.closest("[data-delete-id]");

        if (!deleteButton) {
            return;
        }

        deleteTransaction(deleteButton.dataset.deleteId);
    });


    // Mobile navigation.
    elements.menuToggle.addEventListener("click", () => {
        toggleSidebar();
    });


    // Close mobile navigation after selecting a link.
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".nav-link").forEach(navLink => {
                navLink.classList.remove("active");
            });

            link.classList.add("active");

            if (window.innerWidth <= 850) {
                toggleSidebar(true);
            }
        });
    });


    // Close mobile navigation if the viewport becomes larger.
    window.addEventListener("resize", () => {
        if (window.innerWidth > 850) {
            toggleSidebar(true);
        }
    });

}


/* ============================================
   18. START APPLICATION
============================================ */

initializePage();
