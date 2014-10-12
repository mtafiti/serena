var  _ = require('underscore');  //note: requires underscore

(function (exports) {
    "use strict";

    function LinkedList() {
        // pointer to first item
        this._head = null;
        // pointer to the last item
        this._tail = null;
        // length of list
        this._length = 0;
    }

    LinkedList.prototype._createNewNode = function (data) {

       /* return {
            data: data,
            next: null,
            prev: null
        };
        */
        //if data.next/prev already exists, if so, data is already in some list - clone it
        if (data.hasOwnProperty("next") || data.hasOwnProperty("prev")){
            data = _.clone(data);
        }
        data.next = null;
        data.prev = null;

        return data;
};

    /*
     * Appends a node to the end of the list.
     */
    LinkedList.prototype.append = function (data) {
        var node = this._createNewNode(data);

        if (this._length === 0) {

            // first node, so all pointers to this
            this._head = node;
            this._tail = node;
        } else {

            // put on the tail
            this._tail.next = node;
            node.prev = this._tail;
            this._tail = node;
        }

        // update count
        this._length++;

        return node;
    };

    /*
     * Prepends a node to the end of the list.
     */
    LinkedList.prototype.prepend = function (data) {
        var node = this._createNewNode(data);

        if (this.head() === null) {

            // we are empty, so this is the first node
            // use the same logic as append
            this.append(data);
            return this.head();
        } else {

            // place before head
            this._head.prev = node;
            node.next = this._head;
            this._head = node;
        }

        // update count
        this._length++;

        return node;
    };

    /*
     * Returns the node at the specified index. The index starts at 0.
     */
    LinkedList.prototype.item = function (index) {
        if (index >= 0 && index < this._length) {
            var node = this._head;
            while (index--) {
                node = node.next;
            }
            return node;
        }
        return null;
    };

    /*
     * Returns the node at the head of the list.
     */
    LinkedList.prototype.head = function () {
        return this._head;
    };

    /*
     * Returns the node at the tail of the list.
     */
    LinkedList.prototype.tail = function () {
        return this._tail;
    };

    /*
     * Returns the size of the list.
     */
    LinkedList.prototype.size = function () {
        return this._length;
    };

    /*
     * Inserts node with data after the index
     */
    LinkedList.prototype.insertAt = function (index, data) {
        var node = this.item(index);
        //create new node with the data
        var newNode = this._createNewNode(data);

            //insert if empty
        if (node === null){
            this.append(newNode);
            return;
        }
        if (node.prev === null){
            node.prev = newNode;
            newNode.next = node;
            this._head = newNode;
            this._length++;
            return true;
        }
        node.prev.next = newNode;
        newNode.prev = node.prev;
        node.prev = newNode;
        newNode.next = node;
        this._length++;
        return true;
};

    /*
     * Removes the item at the index.
     */
    LinkedList.prototype.removeAt = function (index) {
        if (index >= 0 && index <= this._length) {
            var node = this.item(index - 1);
            //alter parent
            if (node.prev === null){
                node.next.prev = null;
                this._head = node.next;
                this._length--;
                return true;
            }
            if (node.next === null){
                node.prev.next = null;
                this._tail = node.prev;
                this._length--;
                return true;
            }
            node.prev.next = node.next;
            node.next.prev = node.prev;
            this._length--;
            return true;
        }
        return false;

    };

    /*
     * Removes the item with the data.
     */
    LinkedList.prototype.removeWithData = function (item) {
        var node = this.head;
        var index = 0;
        while (node !== null) {
            var data = node.data;
            if (node.data === item){
                //alter parent
                if (node.prev === null){
                    if (node.next === null){ //its the head
                        this._head = null;
                        this._tail = null;
                        this._length = 0;
                    } else {
                        node.next.prev = null;
                        this._head = node.next;
                    }
                    this._length--;
                    return true;
                }
                if (node.next === null){
                    node.prev.next = null;
                    this._tail = node.prev;
                    this._length--;
                    return true;
                }
                node.prev.next = node.next;
                node.next.prev = node.prev;
                this._length--;
                return true;
            }
            node = node.next;
        }
        return false;

    };

    /*
     * Removes the node. Uses ===
     */
    LinkedList.prototype.removeNode = function (otherNode) {
        var node = this.head;
        var index = 0;
        while (node.next !== null) {
            var data = node.data;
            if (node === otherNode){
                //alter parent
                if (node.prev === null){
                    node.next.prev = null;
                    this._head = node.next;
                    this._length--;
                    return true;
                }
                if (node.next === null){
                    node.prev.next = null;
                    this._tail = node.prev;
                    this._length--;
                    return true;
                }
                node.prev.next = node.next;
                node.next.prev = node.prev;
                this._length--;
                return true;
            }
            node = node.next;
        }
        return false;

    };

    LinkedList.prototype.removeHead = function (index) {
        return this.removeAt(0);
    };
    LinkedList.prototype.removeTail = function (index) {
        return this.removeAt(this.size());
    };


    LinkedList.prototype.each = function(fn /*, thisArg */){

        if (typeof fn !== "function")
            throw new TypeError();

        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        var node = this._head;
        var idx = 0;
        while (node !== null)
        {
            fn.call(thisArg, node, idx);

            idx++;
            node = node.next;
        }
    };

    LinkedList.prototype.some = function(fn /*, thisArg */){

        if (typeof fn !== "function")
            throw new TypeError();

        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        var node = this._head;
        var idx = 0;
        while (node !== null)
        {
            var res = fn.call(thisArg, node, idx++);
            if (res) return res;
            node = node.next;
        }
        return null;
    };

    //like some, but reversed
    LinkedList.prototype.somerev = function(fn /*, thisArg */){

        if (typeof fn !== "function")
            throw new TypeError();

        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        var node = this._tail;
        var idx = 0;
        while (node !== null)
        {
            var res = fn.call(thisArg, node, idx++);
            if (res) return res;
            node = node.prev;
        }
        return null;
    };

    LinkedList.prototype.all = function(fn /*, thisArg */){

        if (typeof fn !== "function")
            throw new TypeError();

        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        var node = this._head;
        while (node !== null)
        {
            var res = fn.call(thisArg, node);
            if (!res){
                return false;
            }
            node = node.next;
        }
        return true;
    };

    LinkedList.prototype.getAll = function(){
        var result = [];
        var node = this._head;
        while (node !== null){
            result.push(_.clone(node));
            node = node.next;
        }
        return result;
    };

    //desctructively adds this otherList to this list
    LinkedList.prototype.merge = function(otherList){
        var clonedOtherlist = _.clone(otherList);

        if (otherList.size() === 0){
            return this;
        }

        if (this._length === 0) {
            this._head = clonedOtherlist.head();
            this._tail = clonedOtherlist.tail();
        } else {

            // put on the tail
            this._tail.next = clonedOtherlist.head();
            clonedOtherlist.head().prev = this._tail;
            this._tail = clonedOtherlist.tail();
        }

        // update count
        this._length = this._length + clonedOtherlist.size();

        return this;
    };

    //case study then code
    //write an app that drives it


    exports.LinkedList = LinkedList;
})(exports);
