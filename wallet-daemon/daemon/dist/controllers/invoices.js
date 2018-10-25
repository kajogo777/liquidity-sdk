"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const lqd_client_1 = __importDefault(require("./lqd-client"));
const liquidity_invoice_generation_1 = __importDefault(require("liquidity-invoice-generation"));
const fs = __importStar(require("fs"));
const transfers_1 = require("./transfers");
const transaction_status_1 = __importStar(require("../models/transaction-status"));
const invoicesFile = `./invoices.json`;
let invoices = undefined;
const redirectionService = 'https://lqd.money';
const restoreInvoices = (file) => {
    fs.readFile(file, 'utf-8', (err, data) => {
        if (err && err.errno !== -2) {
            invoices = {};
        }
        else {
            try {
                invoices = JSON.parse(data);
            }
            catch (err) {
                invoices = {};
            }
        }
    });
};
restoreInvoices(invoicesFile);
const saveInvoices = (file) => __awaiter(this, void 0, void 0, function* () {
    fs.writeFile(file, JSON.stringify(invoices), (err) => {
        if (err) {
            return console.log(`ERROR: ${err}`);
        }
        console.log('Invoices saved');
    });
});
const addInvoice = (invoice) => {
    invoices[invoice.nonce] = invoice;
    saveInvoices(invoicesFile);
};
class Invoices {
    static generate(amount, details, currency) {
        let invoice = liquidity_invoice_generation_1.default.createInvoice({
            publicKey: lqd_client_1.default.wallet().address,
            networkId: lqd_client_1.default.hubProvider().networkId,
            hubAddress: lqd_client_1.default.hubProvider().contract,
        }, amount, details, currency);
        const encoded = liquidity_invoice_generation_1.default.encodeInvoice(invoice.invoice);
        invoice.invoice.nonce = invoice.nonce;
        invoice = invoice.invoice;
        invoice.amount = invoice.amount.toFixed(0);
        invoice.encoded = {
            url: `${redirectionService}/?data=${encoded}`,
            raw: encoded,
        };
        addInvoice(invoice);
        return invoice;
    }
    static list(filters) {
        filters.sender = (typeof filters.sender === 'undefined') ? lqd_client_1.default.wallet().address : filters.sender;
        filters.status = (typeof filters.status === 'undefined') ? transaction_status_1.TransactionStatus.CONFIRMED : filters.status;
        filters.count = (typeof filters.count === 'undefined') ? 100 : filters.count;
        const executed = transfers_1.Transfers.list(filters)
            .filter(transfer => typeof invoices[transfer.nonce] !== 'undefined').map(transfer => invoices[transfer.nonce]);
        return Object.keys(invoices)
            .map(key => {
            const invoice = invoices[key];
            invoice.status = transaction_status_1.default.fromBoolean(executed.indexOf(invoice) >= 0);
            return invoice;
        })
            .filter(invoice => {
            return (typeof filters.nonce !== 'undefined' && filters.nonce === invoice.nonce) ||
                (typeof filters.recipient !== 'undefined' && invoice.destinations.walletAddresses.indexOf(filters.recipient) >= 0) ||
                (typeof filters.amount !== 'undefined' && filters.amount === invoice.amount) ||
                true;
        })
            .slice(0, filters.count)
            .reduce((acc, invoice) => {
            return Object.defineProperty(acc, invoice.nonce, { value: invoice, enumerable: true });
        }, {});
    }
}
exports.default = Invoices;
//# sourceMappingURL=invoices.js.map