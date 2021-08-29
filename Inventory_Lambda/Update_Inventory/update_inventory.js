//sam local invoke UpdateInventory --no-event 
const inventoryService = require('./inventoryService');
const logService = require('./logService');
const messageService = require('./messageService');

exports.handler = async (event, context) => {

    const body = JSON.parse(event.body);

    if(!body.product || !body.action || !body.user) {

        await logService.logInventoryAction("The request did not have the right parameters");
        return 400; 
    }
    
    await inventoryService.updateInventory(body.product, body.action);

    await logService.logInventoryAction(`The user ${body.user} has changed ${body.product} with the action ${body.action}`);
    
    await messageService.queueMessage(`The user ${body.user} has changed ${body.product} with the action ${body.action}`, "inventory");

    return 200;
};
