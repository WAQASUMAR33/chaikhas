<?php

namespace App\Observers;

use App\Services\WebhookSync\WebhookDispatcher;
use Illuminate\Database\Eloquent\Model;

class DatabaseSyncObserver
{
    /**
     * Handle the Model "created" event.
     */
    public function created(Model $model): void
    {
        WebhookDispatcher::dispatchModelChange($model, 'created');
    }

    /**
     * Handle the Model "updated" event.
     */
    public function updated(Model $model): void
    {
        WebhookDispatcher::dispatchModelChange($model, 'updated');
    }

    /**
     * Handle the Model "deleted" event.
     */
    public function deleted(Model $model): void
    {
        WebhookDispatcher::dispatchModelChange($model, 'deleted');
    }
}
