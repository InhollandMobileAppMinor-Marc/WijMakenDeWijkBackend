import { MongoDB, MutableRepository, WithId } from "@peregrine/mongo-connect"
import moment from "moment"

interface SettingsObject {
    postsLastModifiedTimeStamp?: Date
}

export class Settings {
    private readonly repo: MutableRepository<SettingsObject>

    constructor(db: MongoDB) {
        this.repo = db.getMutableRepository<SettingsObject>("settings", {
            postsLastModifiedTimeStamp: Date
        }, (error: Error) => {
            console.error(error)
            return true
        })
    }

    private async getSettings(): Promise<WithId<SettingsObject> | null> {
        return await this.repo.getById("1") ?? await this.repo.addObjectWithId({
            id: "1"
        })
    }

    public async getPostsLastModifiedTimeStamp(): Promise<moment.Moment | null> {
        const settings = await this.getSettings()
        const timestamp = settings?.postsLastModifiedTimeStamp ?? null
        return timestamp === null ? null : moment(timestamp)
    }

    public async setPostsLastModifiedTimeStamp(timestamp: moment.Moment): Promise<void> {
        const settings = await this.getSettings()
        if(settings === null) return
        await this.repo.patch(settings.id, {
            postsLastModifiedTimeStamp: timestamp.toDate()
        })
    }
}
