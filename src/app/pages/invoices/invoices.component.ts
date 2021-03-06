import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { formatDate } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Actions } from '@ngrx/effects';

import { MatTableDataSource, MatSort } from '@angular/material';
import { Node } from '../../shared/models/RTLconfig';
import { GetInfo, Invoice } from '../../shared/models/lndModels';
import { LoggerService } from '../../shared/services/logger.service';

import { newlyAddedRowAnimation } from '../../shared/animation/row-animation';
import * as RTLActions from '../../shared/store/rtl.actions';
import * as fromRTLReducer from '../../shared/store/rtl.reducers';

@Component({
  selector: 'rtl-invoices',
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss'],
  animations: [newlyAddedRowAnimation]
})
export class InvoicesComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort) sort: MatSort;
  public selNode: Node;
  public newlyAddedInvoiceMemo = '';
  public newlyAddedInvoiceValue = 0;
  public flgAnimate = true;
  public memo = '';
  public invoiceValue: number;
  public displayedColumns = [];
  public invoicePaymentReq = '';
  public invoices: any;
  public information: GetInfo = {};
  public flgLoading: Array<Boolean | 'error'> = [true];
  public flgSticky = false;
  private unSubs: Array<Subject<void>> = [new Subject(), new Subject(), new Subject(), new Subject(), new Subject()];

  constructor(private logger: LoggerService, private store: Store<fromRTLReducer.State>, private actions$: Actions) {
    switch (true) {
      case (window.innerWidth <= 415):
        this.displayedColumns = ['creation_date', 'memo', 'value', 'settled'];
        break;
      case (window.innerWidth > 415 && window.innerWidth <= 730):
        this.displayedColumns = ['creation_date', 'settle_date', 'memo', 'value', 'settled', 'amt_paid_sat'];
        break;
      case (window.innerWidth > 730 && window.innerWidth <= 1024):
        this.displayedColumns = ['creation_date', 'settle_date', 'memo', 'value', 'settled', 'amt_paid_sat'];
        break;
      case (window.innerWidth > 1024 && window.innerWidth <= 1280):
        this.flgSticky = true;
        this.displayedColumns = ['creation_date', 'settle_date', 'memo', 'value', 'settled', 'amt_paid_sat', 'expiry', 'cltv_expiry'];
        break;
      default:
        this.flgSticky = true;
        this.displayedColumns = ['creation_date', 'settle_date', 'memo', 'value', 'settled', 'amt_paid_sat', 'expiry', 'cltv_expiry'];
        break;
    }
  }

  ngOnInit() {
    this.store.select('rtlRoot')
    .pipe(takeUntil(this.unSubs[0]))
    .subscribe((rtlStore: fromRTLReducer.State) => {
      rtlStore.effectErrors.forEach(effectsErr => {
        if (effectsErr.action === 'FetchInvoices') {
          this.flgLoading[0] = 'error';
        }
      });
      this.selNode = rtlStore.selNode;
      this.information = rtlStore.information;
      this.logger.info(rtlStore);
      this.loadInvoicesTable(rtlStore.invoices);
      if (this.flgLoading[0] !== 'error') {
        this.flgLoading[0] = (undefined !== rtlStore.invoices[0]) ? false : true;
      }
    });

  }

  onAddInvoice(form: any) {
    this.flgAnimate = true;
    this.newlyAddedInvoiceMemo = this.memo;
    this.newlyAddedInvoiceValue = this.invoiceValue;
    this.store.dispatch(new RTLActions.OpenSpinner('Adding Invoice...'));
    this.store.dispatch(new RTLActions.SaveNewInvoice({memo: this.memo, invoiceValue: this.invoiceValue}));
    this.actions$
    .pipe(
      takeUntil(this.unSubs[1]),
      filter((action) => action.type === RTLActions.ADD_INVOICE)
    ).subscribe((newInvoiceAction: RTLActions.AddInvoice) => {
      this.logger.info(newInvoiceAction.payload);
      this.invoicePaymentReq = newInvoiceAction.payload.payment_request;
    });

  }

  onInvoiceClick(selRow: Invoice, event: any) {
    const selInvoice = this.invoices.data.filter(invoice => {
      return invoice.payment_request === selRow.payment_request;
    })[0];
    const reorderedInvoice = JSON.parse(JSON.stringify(selInvoice, [
      'creation_date_str', 'settle_date_str', 'memo', 'receipt', 'r_preimage', 'r_hash', 'value', 'settled', 'payment_request',
      'description_hash', 'expiry', 'fallback_addr', 'cltv_expiry', 'route_hints', 'private', 'add_index', 'settle_index',
      'amt_paid', 'amt_paid_sat', 'amt_paid_msat'
    ] , 2));
    this.store.dispatch(new RTLActions.OpenAlert({ width: '75%', data: {
      type: 'INFO',
      message: JSON.stringify(reorderedInvoice)
    }}));
  }

  loadInvoicesTable(invoices) {
    this.invoices = new MatTableDataSource<Invoice>([...invoices]);
    this.invoices.sort = this.sort;
    this.invoices.data.forEach(invoice => {
      if (undefined !== invoice.creation_date_str) {
        invoice.creation_date_str = (invoice.creation_date_str === '') ? '' : formatDate(invoice.creation_date_str, 'MMM/dd/yy HH:mm:ss', 'en-US');
      }
      if (undefined !== invoice.settle_date_str) {
        invoice.settle_date_str = (invoice.settle_date_str === '') ? '' : formatDate(invoice.settle_date_str, 'MMM/dd/yy HH:mm:ss', 'en-US');
      }
    });
    setTimeout(() => { this.flgAnimate = false; }, 3000);
    this.logger.info(this.invoices);
  }

  resetData() {
    this.memo = '';
    this.invoiceValue = 0;
  }

  applyFilter(selFilter: string) {
    this.invoices.filter = selFilter;
  }

  ngOnDestroy() {
    this.unSubs.forEach(completeSub => {
      completeSub.next();
      completeSub.complete();
    });
  }

}
